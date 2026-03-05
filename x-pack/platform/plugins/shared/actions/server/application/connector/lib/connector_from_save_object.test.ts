/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core-saved-objects-common/src/server_types';
import type { RawAction } from '../../../types';
import { connectorFromSavedObject } from './connector_from_save_object';
import type { GetUserTokenConnectorsSoResult } from '../../../data/connector/types';

function makeSavedObject(id: string, overrides: Partial<RawAction> = {}): SavedObject<RawAction> {
  return {
    id,
    type: 'action',
    attributes: {
      actionTypeId: '.test',
      name: 'Test connector',
      isMissingSecrets: false,
      config: {},
      secrets: {},
      ...overrides,
    },
    references: [],
  };
}

describe('connectorFromSavedObject', () => {
  describe('currentUserConnectionStatus', () => {
    describe('authMode resolves to shared', () => {
      it('returns not_applicable when no authMode is stored (defaults to shared)', () => {
        const so = makeSavedObject('conn-1');
        const userTokenConnectors: GetUserTokenConnectorsSoResult = {
          connectorIds: ['conn-1'],
        };
        const result = connectorFromSavedObject(so, false, false, true, userTokenConnectors);
        expect(result.currentUserConnectionStatus).toBe('not_applicable');
      });

      it('returns not_applicable when authMode is explicitly shared', () => {
        const so = makeSavedObject('conn-1', { authMode: 'shared' });
        const result = connectorFromSavedObject(so, false, false, true, {
          connectorIds: ['conn-1'],
        });
        expect(result.currentUserConnectionStatus).toBe('not_applicable');
      });
    });

    describe('authMode is per-user', () => {
      it('returns connected when the connector id is in the userTokenConnectors list', () => {
        const so = makeSavedObject('conn-1', { authMode: 'per-user' });
        const result = connectorFromSavedObject(so, false, false, true, {
          connectorIds: ['conn-1', 'conn-2'],
        });
        expect(result.currentUserConnectionStatus).toBe('connected');
      });

      it('returns not_connected when the connector id is not in the userTokenConnectors list', () => {
        const so = makeSavedObject('conn-1', { authMode: 'per-user' });
        const result = connectorFromSavedObject(so, false, false, true, {
          connectorIds: ['conn-other'],
        });
        expect(result.currentUserConnectionStatus).toBe('not_connected');
      });

      it('returns not_connected when userTokenConnectors list is empty', () => {
        const so = makeSavedObject('conn-1', { authMode: 'per-user' });
        const result = connectorFromSavedObject(so, false, false, true, { connectorIds: [] });
        expect(result.currentUserConnectionStatus).toBe('not_connected');
      });
    });

    describe('when userTokenConnectors is not provided', () => {
      it('returns not_applicable', () => {
        const so = makeSavedObject('conn-1', { authMode: 'per-user' });
        const result = connectorFromSavedObject(so, false, false, true);
        expect(result.currentUserConnectionStatus).toBe('not_applicable');
      });
    });
  });
});
