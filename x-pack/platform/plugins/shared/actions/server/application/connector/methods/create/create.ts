/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { i18n } from '@kbn/i18n';
import type { SavedObjectAttributes } from '@kbn/core/server';
import { SavedObjectsUtils, SavedObjectsErrorHelpers } from '@kbn/core/server';
import { ACTION_TYPE_SOURCES } from '@kbn/actions-types';
import type { ConnectorCreateParams } from './types';
import { ConnectorAuditAction, connectorAuditEvent } from '../../../../lib/audit_events';
import { validateConfig, validateConnector, validateSecrets } from '../../../../lib';
import { isConnectorDeprecated } from '../../lib';
import type { HookServices, ActionResult } from '../../../../types';
import { tryCatch } from '../../../../lib';
import { invokePostCreateListeners } from '../../../../lib/invoke_lifecycle_listeners';
import { ensureConfigAuthType } from '../../../../lib/ensure_config_auth_type';
import { inferAuthMode } from '../../../../lib/infer_auth_mode';
import { validateConnectorId } from '../../../../../common/validate_connector_id';

export async function create({
  context,
  action: { actionTypeId, name, config, secrets },
  options,
}: ConnectorCreateParams): Promise<ActionResult> {
  const id = options?.id || SavedObjectsUtils.generateId();

  try {
    await context.authorization.ensureAuthorized({
      operation: 'create',
      actionTypeId,
    });
  } catch (error) {
    context.auditLogger?.log(
      connectorAuditEvent({
        action: ConnectorAuditAction.CREATE,
        savedObject: { type: 'action', id },
        error,
      })
    );
    throw error;
  }

  const foundInMemoryConnector = context.inMemoryConnectors.find(
    (connector) => connector.id === id
  );

  if (
    context.actionTypeRegistry.isSystemActionType(actionTypeId) ||
    foundInMemoryConnector?.isSystemAction
  ) {
    throw Boom.badRequest(
      i18n.translate('xpack.actions.serverSideErrors.systemActionCreationForbidden', {
        defaultMessage: 'System action creation is forbidden. Action type: {actionTypeId}.',
        values: {
          actionTypeId,
        },
      })
    );
  }

  if (foundInMemoryConnector?.isPreconfigured) {
    throw Boom.badRequest(
      i18n.translate('xpack.actions.serverSideErrors.predefinedIdConnectorAlreadyExists', {
        defaultMessage: 'This {id} already exists in a preconfigured action.',
        values: {
          id,
        },
      })
    );
  }

  const actionType = context.actionTypeRegistry.get(actionTypeId);
  const configurationUtilities = context.actionTypeRegistry.getUtils();
  const validatedActionTypeConfig = validateConfig(actionType, config, {
    configurationUtilities,
  });
  const validatedActionTypeSecrets = validateSecrets(actionType, secrets, {
    configurationUtilities,
  });
  if (actionType.validate?.connector) {
    validateConnector(actionType, { config, secrets });
  }
  context.actionTypeRegistry.ensureActionTypeEnabled(actionTypeId);

  if (options?.id) {
    validateConnectorId(options.id);
  }

  const hookServices: HookServices = {
    scopedClusterClient: context.scopedClusterClient,
  };

  if (actionType.preSaveHook) {
    try {
      await actionType.preSaveHook({
        connectorId: id,
        config,
        secrets,
        logger: context.logger,
        request: context.request,
        services: hookServices,
        isUpdate: false,
      });
    } catch (error) {
      context.auditLogger?.log(
        connectorAuditEvent({
          action: ConnectorAuditAction.CREATE,
          savedObject: { type: 'action', id },
          error,
        })
      );
      throw error;
    }
  }

  context.auditLogger?.log(
    connectorAuditEvent({
      action: ConnectorAuditAction.CREATE,
      savedObject: { type: 'action', id },
      outcome: 'unknown',
    })
  );
  const authMode = inferAuthMode({
    authTypeRegistry: context.authTypeRegistry,
    secrets,
    config,
  });

  const configForSave =
    actionType.source === ACTION_TYPE_SOURCES.spec
      ? ensureConfigAuthType(
          validatedActionTypeConfig as Record<string, unknown>,
          validatedActionTypeSecrets as Record<string, unknown>
        )
      : validatedActionTypeConfig;

  const result = await tryCatch(
    async () =>
      await context.unsecuredSavedObjectsClient.create(
        'action',
        {
          actionTypeId,
          name,
          isMissingSecrets: false,
          config: configForSave as SavedObjectAttributes,
          secrets: validatedActionTypeSecrets as SavedObjectAttributes,
          ...(authMode !== undefined ? { authMode } : {}),
        },
        { id }
      )
  );

  const wasSuccessful = !(result instanceof Error);
  const label = `connectorId: "${id}"; type: ${actionTypeId}`;
  const tags = ['post-save-hook', id];

  if (actionType.postSaveHook) {
    try {
      await actionType.postSaveHook({
        connectorId: id,
        config,
        secrets,
        logger: context.logger,
        request: context.request,
        services: hookServices,
        isUpdate: false,
        wasSuccessful,
      });
    } catch (err) {
      context.logger.error(`postSaveHook create error for ${label}: ${err.message}`, {
        tags,
      });
    }
  }

  // Invoke cross-plugin lifecycle listeners (fire-and-forget to avoid blocking the API response)
  void invokePostCreateListeners(
    context.connectorLifecycleListeners,
    actionTypeId,
    {
      connectorId: id,
      connectorName: name,
      config,
      logger: context.logger,
      request: context.request,
      services: hookServices,
      wasSuccessful,
    },
    context.logger
  );

  if (!wasSuccessful) {
    if (SavedObjectsErrorHelpers.isConflictError(result)) {
      throw Boom.conflict(
        i18n.translate('xpack.actions.serverSideErrors.connectorIdConflict', {
          defaultMessage: 'A connector is already using this ID: {id}. Choose a different ID.',
          values: { id },
        })
      );
    }
    throw result;
  }

  return {
    id: result.id,
    actionTypeId: result.attributes.actionTypeId,
    isMissingSecrets: result.attributes.isMissingSecrets,
    name: result.attributes.name,
    config: result.attributes.config,
    isPreconfigured: false,
    isSystemAction: false,
    isDeprecated: isConnectorDeprecated(result.attributes),
    isConnectorTypeDeprecated: context.actionTypeRegistry.isDeprecated(actionTypeId),
    ...(result.attributes.authMode !== undefined ? { authMode: result.attributes.authMode } : {}),
  };
}
