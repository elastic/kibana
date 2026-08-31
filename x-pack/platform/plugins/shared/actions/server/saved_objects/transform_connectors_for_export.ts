/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/server';
import type { ActionsConfigurationUtilities } from '../actions_config';
import { validateSecrets } from '../lib';
import type { RawAction, ActionType, ActionTypeRegistryContract } from '../types';

export async function transformConnectorsForExport(
  connectors: SavedObject[],
  actionTypeRegistry: ActionTypeRegistryContract
): Promise<Array<SavedObject<RawAction>>> {
  return Promise.all(
    connectors.map(async (savedObject) => {
      const connector = savedObject as SavedObject<RawAction>;
      const resolution = actionTypeRegistry.tryResolveActionType(
        connector.attributes.specId ?? connector.attributes.actionTypeId,
        connector.attributes.specVersion
      );
      if (!resolution) {
        return {
          ...connector,
          attributes: {
            ...connector.attributes,
            secrets: {},
            isMissingSecrets: true,
          },
        };
      }
      const { actionType, specId, connectorSpec } = resolution;
      const connectorValidation =
        connectorSpec?.version && actionType.getConnectorValidation
          ? await actionType.getConnectorValidation(connectorSpec.version, specId)
          : undefined;
      const actionTypeForValidation = connectorValidation
        ? { ...actionType, validate: connectorValidation }
        : actionType;

      return transformConnectorForExport(
        connector,
        actionTypeForValidation,
        actionTypeRegistry.getUtils()
      );
    })
  );
}

function transformConnectorForExport(
  connector: SavedObject<RawAction>,
  actionType: ActionType,
  configurationUtilities: ActionsConfigurationUtilities
): SavedObject<RawAction> {
  let isMissingSecrets = false;

  try {
    // If connector requires secrets, this will throw an error
    validateSecrets(actionType, {}, { configurationUtilities });

    // If connector has optional (or no) secrets, set isMissingSecrets value to value of hasAuth
    // If connector doesn't have hasAuth value, default to isMissingSecrets: false
    isMissingSecrets = (connector?.attributes?.config?.hasAuth as boolean) ?? false;
  } catch (err) {
    isMissingSecrets = true;
  }

  return {
    ...connector,
    attributes: {
      ...connector.attributes,
      secrets: {},
      isMissingSecrets,
    },
  };
}
