/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ACTION_SAVED_OBJECT_TYPE } from '@kbn/actions-plugin/server';
import type { SavedObjectReference } from '@kbn/core/server';
import type {
  CaseConnector,
  CaseCustomFields,
  ConnectorTypeFields,
} from '../../common/types/domain';
import { CustomFieldTypes } from '../../common/types/domain';
import type { CasePersistedAttributes } from '../common/types/case';
import type { ConnectorPersisted, ConnectorPersistedFields } from '../common/types/connectors';
import { getNoneCaseConnector } from '../common/utils';

export function findConnectorIdReference(
  name: string,
  references?: SavedObjectReference[]
): SavedObjectReference | undefined {
  return references?.find((ref) => ref.type === ACTION_SAVED_OBJECT_TYPE && ref.name === name);
}

export function transformESConnectorToExternalModel({
  connector,
  references,
  referenceName,
}: {
  connector?: ConnectorPersisted;
  references?: SavedObjectReference[];
  referenceName: string;
}): CaseConnector | undefined {
  const connectorIdRef = findConnectorIdReference(referenceName, references);
  return transformConnectorFieldsToExternalModel(connector, connectorIdRef?.id);
}

function transformConnectorFieldsToExternalModel(
  connector?: ConnectorPersisted,
  connectorId?: string
): CaseConnector | undefined {
  if (!connector) {
    return;
  }

  // if the connector is valid, but we can't find it's ID in the reference, then it must be malformed
  // or it was a none connector which doesn't have a reference (a none connector doesn't point to any actual connector
  // saved object)
  if (!connectorId) {
    return getNoneCaseConnector();
  }

  const connectorTypeField = {
    type: connector.type,
    fields:
      connector.fields != null && connector.fields.length > 0
        ? connector.fields.reduce((fields, { key, value }) => {
            fields[key] = value;
            return fields;
          }, {} as Record<string, unknown>)
        : null,
  } as ConnectorTypeFields;

  return {
    id: connectorId,
    name: connector.name,
    ...connectorTypeField,
  };
}

export function transformESConnectorOrUseDefault({
  connector,
  references,
  referenceName,
}: {
  connector?: ConnectorPersisted;
  references?: SavedObjectReference[];
  referenceName: string;
}): CaseConnector {
  return (
    transformESConnectorToExternalModel({ connector, references, referenceName }) ??
    getNoneCaseConnector()
  );
}

export function transformFieldsToESModel(connector: CaseConnector): ConnectorPersistedFields {
  if (!connector.fields) {
    return [];
  }

  return Object.entries(connector.fields).reduce<ConnectorPersistedFields>(
    (acc, [key, value]) => [
      ...acc,
      {
        key,
        value,
      },
    ],
    []
  );
}

export function transformCustomFieldsToESModel(customFields: CaseCustomFields) {
  return customFields.map((customField) => {
    if (customField.type === CustomFieldTypes.LIST && customField.value) {
      const [selectedKey] = Object.keys(customField.value);
      const [value] = Object.values(customField.value);
      return {
        type: CustomFieldTypes.LIST,
        key: `${customField.key}.${selectedKey}`,
        value,
      };
    }
    return customField;
  });
}

export function transformCustomFieldsToExternalModel(
  customFields: NonNullable<CasePersistedAttributes['customFields']>
) {
  return customFields.map((customField) => {
    if (customField.type === CustomFieldTypes.LIST && customField.value) {
      // Derive the actual custom field key and the option key from customField.key
      // Split the key by '.' and use the last part as the selectedKey. Everything else is the customField key.
      // Don't simply do const [key, selectedKey] = customField.key.split('.') in case the `key` contains a '.'
      const keyParts = customField.key.split('.');
      const selectedKey = keyParts[keyParts.length - 1];
      const key = keyParts.slice(0, -1).join('.');
      const label = customField.value;
      return {
        ...customField,
        key,
        value: { [selectedKey]: label },
      };
    }
    return customField;
  });
}
