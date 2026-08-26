/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { SavedObject } from '@kbn/core/server';
import { compare, valid } from 'semver';
import { ConnectorAuditAction, connectorAuditEvent } from '../../../../lib/audit_events';
import { validateConfig, validateConnector, validateSecrets } from '../../../../lib';
import type { RawAction } from '../../../../types';
import { connectorFromSavedObject, isConnectorDeprecated } from '../../lib';
import type { Connector } from '../../types';
import type { ConnectorUpgradeParams, ConnectorUpgradeResult } from './types';

const getConnector = (
  context: ConnectorUpgradeParams['context'],
  savedObject: SavedObject<RawAction>
): Connector =>
  connectorFromSavedObject(
    savedObject,
    isConnectorDeprecated(savedObject.attributes),
    context.actionTypeRegistry.isDeprecated(savedObject.attributes.actionTypeId),
    context.actionTypeRegistry
  );

export async function upgrade({
  context,
  id,
}: ConnectorUpgradeParams): Promise<ConnectorUpgradeResult> {
  try {
    await context.authorization.ensureAuthorized({ operation: 'update' });
  } catch (error) {
    context.auditLogger?.log(
      connectorAuditEvent({
        action: ConnectorAuditAction.UPDATE,
        savedObject: { type: 'action', id },
        error,
      })
    );
    throw error;
  }

  if (!context.isESOCanEncrypt) {
    throw new Error(
      'Unable to upgrade connector because the Encrypted Saved Objects plugin is missing encryption key.'
    );
  }

  const spaceId = context.spaceId ?? (context.spaces && context.spaces.getSpaceId(context.request));
  const savedObject =
    await context.encryptedSavedObjectsClient.getDecryptedAsInternalUser<RawAction>('action', id, {
      ...(spaceId && spaceId !== 'default' ? { namespace: spaceId } : {}),
    });
  const {
    actionTypeId,
    specId,
    specVersion: fromVersion,
    config,
    secrets,
  } = savedObject.attributes;

  if (!specId || !fromVersion) {
    throw Boom.badRequest(`Connector "${id}" is not pinned to a declarative connector spec.`);
  }

  const resolution = context.actionTypeRegistry.tryResolveActionType(specId);
  const toVersion = resolution?.connectorSpec?.version;
  if (!resolution || !toVersion) {
    throw Boom.notFound(`Active spec for connector type "${specId}" not found.`);
  }
  if (resolution.registeredActionTypeId !== actionTypeId) {
    throw Boom.badRequest(
      `Connector "${id}" is owned by action type "${actionTypeId}", but spec "${specId}" resolved to "${resolution.registeredActionTypeId}".`
    );
  }
  if (!valid(fromVersion)) {
    throw Boom.badRequest(`Connector "${id}" has invalid pinned spec version "${fromVersion}".`);
  }
  if (!valid(toVersion)) {
    throw Boom.badRequest(
      `Active spec for connector type "${specId}" has invalid version "${toVersion}".`
    );
  }

  const connector = getConnector(context, savedObject);
  if (fromVersion === toVersion) {
    return { status: 'current', fromVersion, toVersion, connector };
  }

  if (compare(fromVersion, toVersion) > 0) {
    throw Boom.badRequest(
      `Cannot downgrade connector "${id}" from spec version "${fromVersion}" to "${toVersion}".`
    );
  }

  context.actionTypeRegistry.ensureActionTypeEnabled(specId, toVersion);

  const actionType = context.actionTypeRegistry.get(actionTypeId);
  const connectorValidation = actionType.getConnectorValidation
    ? await actionType.getConnectorValidation(toVersion, specId)
    : undefined;
  if (!connectorValidation) {
    throw Boom.badRequest(
      `Connector specification "${specId}" version "${toVersion}" is unavailable.`
    );
  }

  try {
    connectorValidation.config?.schema.parse(config);
    connectorValidation.secrets?.schema.parse(secrets);
  } catch {
    return { status: 'reconfiguration_required', fromVersion, toVersion, connector };
  }

  const actionTypeForValidation = { ...actionType, validate: connectorValidation };
  const configurationUtilities = context.actionTypeRegistry.getUtils();
  validateConfig(actionTypeForValidation, config, { configurationUtilities });
  validateSecrets(actionTypeForValidation, secrets, { configurationUtilities });

  try {
    if (actionTypeForValidation.validate.connector) {
      validateConnector(actionTypeForValidation, { config, secrets });
    }
  } catch {
    return { status: 'reconfiguration_required', fromVersion, toVersion, connector };
  }

  context.auditLogger?.log(
    connectorAuditEvent({
      action: ConnectorAuditAction.UPDATE,
      savedObject: { type: 'action', id },
      outcome: 'unknown',
    })
  );

  const result = await context.unsecuredSavedObjectsClient.update<RawAction>(
    'action',
    id,
    { specVersion: toVersion },
    { version: savedObject.version }
  );

  await context.evictClientPool?.(id);

  const updatedSavedObject: SavedObject<RawAction> = {
    ...savedObject,
    ...result,
    references: result.references ?? savedObject.references,
    attributes: {
      ...savedObject.attributes,
      ...result.attributes,
      specVersion: toVersion,
    },
  };

  return {
    status: 'upgraded',
    fromVersion,
    toVersion,
    connector: getConnector(context, updatedSavedObject),
  };
}
