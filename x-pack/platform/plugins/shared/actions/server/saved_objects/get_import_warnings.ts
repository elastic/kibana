/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { SavedObject, SavedObjectsImportWarning } from '@kbn/core/server';
import { isValidId } from '@kbn/human-readable-id';
import { CONNECTOR_ID_MAX_LENGTH } from '../../common';
import type { InMemoryConnector, RawAction } from '../types';

const makeConnectorWarning = (message: string): SavedObjectsImportWarning[] => {
  return [
    {
      type: 'action_required',
      message,
      actionPath: '/app/management/insightsAndAlerting/triggersActionsConnectors',
      buttonLabel: GO_TO_CONNECTORS_BUTTON_LABLE,
    },
  ];
};

export function getImportWarnings(
  connectors: Array<SavedObject<RawAction>>
): SavedObjectsImportWarning[] {
  const connectorsWithSecrets = connectors.filter(
    (connector) => connector.attributes.isMissingSecrets
  );
  if (connectorsWithSecrets.length === 0) {
    return [];
  }
  const message = i18n.translate('xpack.actions.savedObjects.onImportText', {
    defaultMessage:
      '{connectorsWithSecretsLength} {connectorsWithSecretsLength, plural, one {connector has} other {connectors have}} sensitive information that require updates.',
    values: {
      connectorsWithSecretsLength: connectorsWithSecrets.length,
    },
  });
  return [
    {
      type: 'action_required',
      message,
      actionPath: '/app/management/insightsAndAlerting/triggersActionsConnectors',
      buttonLabel: GO_TO_CONNECTORS_BUTTON_LABLE,
    } as SavedObjectsImportWarning,
  ];
}

export function getPreconfiguredConflictWarnings(
  connectors: Array<SavedObject<RawAction> & { destinationId?: string }>,
  inMemoryConnectors: InMemoryConnector[]
): SavedObjectsImportWarning[] {
  const preconfiguredIds = new Set(
    inMemoryConnectors.filter((c) => c.isPreconfigured).map((c) => c.id)
  );

  const conflictingIds = connectors
    .filter(({ id, destinationId }) => !destinationId && preconfiguredIds.has(id))
    .map((c) => c.id);

  if (conflictingIds.length === 0) return [];

  return makeConnectorWarning(
    i18n.translate('xpack.actions.savedObjects.preconfiguredConflictWarning', {
      defaultMessage:
        '{count, plural, one {Connector} other {Connectors}} with {count, plural, one {ID} other {IDs}} [{ids}] {count, plural, one {conflicts} other {conflict}} with {count, plural, one {a} other {}} preconfigured {count, plural, one {connector} other {connectors}} and {count, plural, one {was} other {were}} removed. The preconfigured {count, plural, one {connector} other {connectors}} will be used instead.',
      values: {
        count: conflictingIds.length,
        ids: conflictingIds.join(', '),
      },
    })
  );
}

export function getConnectorsWithInvalidIds(
  connectors: Array<SavedObject<RawAction> & { destinationId?: string }>
) {
  return connectors.filter(
    ({ id, destinationId }) => !destinationId && !isValidId(id, CONNECTOR_ID_MAX_LENGTH, 1)
  );
}

export function getInvalidConnectorIdWarnings(
  connectors: Array<SavedObject<RawAction> & { destinationId?: string }>
): SavedObjectsImportWarning[] {
  const invalidConnectors = getConnectorsWithInvalidIds(connectors);

  const invalidIds = invalidConnectors.map((c) => c.id);

  if (invalidIds.length === 0) return [];

  return makeConnectorWarning(
    i18n.translate('xpack.actions.savedObjects.invalidConnectorIdWarning', {
      defaultMessage:
        '{count, plural, one {Connector} other {Connectors}} with {count, plural, one {ID} other {IDs}} [{ids}] {count, plural, one {has an} other {have}} invalid {count, plural, one {ID} other {IDs}} and {count, plural, one {was} other {were}} removed. Connector IDs must contain only lowercase letters, numbers, and hyphens and be {maxLength} characters or less.',
      values: {
        count: invalidIds.length,
        ids: invalidIds.join(', '),
        maxLength: CONNECTOR_ID_MAX_LENGTH,
      },
    })
  );
}

export const GO_TO_CONNECTORS_BUTTON_LABLE = i18n.translate(
  'xpack.actions.savedObjects.goToConnectorsButtonText',
  { defaultMessage: 'Go to connectors' }
);
