/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { ActionsClientContext } from '../../../../actions_client';
import { ACTION_SAVED_OBJECT_TYPE } from '../../../../constants/saved_objects';
import { validateConfig, validateSecrets } from '../../../../lib';
import { ConnectorAuditAction, connectorAuditEvent } from '../../../../lib/audit_events';
import { getActionKibanaPrivileges } from '../../../../lib/get_action_kibana_privileges';
import type { RawAction } from '../../../../types';

export interface SandboxEnvVars {
  /** Environment variables to inject into a sandbox command, keyed by name. */
  env: Record<string, string>;
  /** Values of the variables the connector type declares as sensitive. */
  sensitiveValues: string[];
}

interface ConnectorMaterial {
  actionTypeId: string;
  config: Record<string, unknown>;
  secrets: Record<string, unknown>;
}

const loadConnectorMaterial = async (
  context: ActionsClientContext,
  connectorId: string
): Promise<ConnectorMaterial> => {
  const { inMemoryConnectors, encryptedSavedObjectsClient, isESOCanEncrypt, request, spaces } =
    context;

  const inMemoryConnector = inMemoryConnectors.find(({ id }) => id === connectorId);
  if (inMemoryConnector) {
    if (inMemoryConnector.isSystemAction) {
      throw Boom.badRequest(`Connector [${connectorId}] is a system action`);
    }
    return {
      actionTypeId: inMemoryConnector.actionTypeId,
      config: inMemoryConnector.config ?? {},
      secrets: inMemoryConnector.secrets ?? {},
    };
  }

  if (!isESOCanEncrypt) {
    throw new Error(
      `Unable to get sandbox env vars because the Encrypted Saved Objects plugin is missing encryption key. Please set xpack.encryptedSavedObjects.encryptionKey in the kibana.yml or use the bin/kibana-encryption-keys command.`
    );
  }

  const spaceId = context.spaceId ?? spaces?.getSpaceId(request);
  const { attributes } = await encryptedSavedObjectsClient.getDecryptedAsInternalUser<RawAction>(
    ACTION_SAVED_OBJECT_TYPE,
    connectorId,
    spaceId && spaceId !== 'default' ? { namespace: spaceId } : {}
  );

  if (attributes.isMissingSecrets) {
    throw Boom.badRequest(`Connector [${connectorId}] is missing secrets`);
  }
  if (attributes.authMode === 'per-user') {
    throw Boom.badRequest(
      `Connector [${connectorId}] uses per-user authentication, which is not supported in agent sandboxes`
    );
  }

  return {
    actionTypeId: attributes.actionTypeId,
    config: attributes.config,
    secrets: attributes.secrets,
  };
};

/**
 * Resolves the environment variables a sandbox-enabled connector exposes to agent sandboxes.
 * The caller must be allowed to execute the connector.
 */
export async function getSandboxEnvVars(
  context: ActionsClientContext,
  connectorId: string
): Promise<SandboxEnvVars> {
  const { actionTypeRegistry, authorization, auditLogger, logger } = context;
  const savedObject = { type: ACTION_SAVED_OBJECT_TYPE, id: connectorId };

  try {
    const { actionTypeId, config, secrets } = await loadConnectorMaterial(context, connectorId);
    const actionType = actionTypeRegistry.get(actionTypeId);
    const { sandbox } = actionType;
    if (!sandbox) {
      throw Boom.badRequest(`Connector type [${actionTypeId}] does not support agent sandboxes`);
    }

    await authorization.ensureAuthorized({
      operation: 'execute',
      additionalPrivileges: getActionKibanaPrivileges(context, actionTypeId),
      actionTypeId,
    });

    const configurationUtilities = actionTypeRegistry.getUtils();
    const env = await sandbox.getEnvVars({
      config: validateConfig(actionType, config, { configurationUtilities }),
      secrets: validateSecrets(actionType, secrets, { configurationUtilities }),
      log: logger,
    });

    const declaredNames = Object.keys(sandbox.envVars);
    const returnedNames = Object.keys(env);
    const missingNames = declaredNames.filter((name) => env[name] === undefined);
    const undeclaredNames = returnedNames.filter((name) => !sandbox.envVars[name]);
    if (missingNames.length > 0 || undeclaredNames.length > 0) {
      throw new Error(
        `Connector type [${actionTypeId}] returned env vars that do not match its declaration ` +
          `(missing: [${missingNames.join(', ')}], undeclared: [${undeclaredNames.join(', ')}])`
      );
    }

    auditLogger?.log(
      connectorAuditEvent({ action: ConnectorAuditAction.GET_SANDBOX_ENV_VARS, savedObject })
    );

    return {
      env,
      sensitiveValues: declaredNames
        .filter((name) => sandbox.envVars[name].sensitive)
        .map((name) => env[name]),
    };
  } catch (error) {
    auditLogger?.log(
      connectorAuditEvent({
        action: ConnectorAuditAction.GET_SANDBOX_ENV_VARS,
        savedObject,
        error,
      })
    );
    throw error;
  }
}
