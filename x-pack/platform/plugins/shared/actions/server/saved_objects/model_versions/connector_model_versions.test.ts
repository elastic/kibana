/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

import type {
  SavedObjectModelTransformationContext,
  SavedObjectsFullModelVersion,
} from '@kbn/core-saved-objects-server';
import type { Logger } from '@kbn/core/server';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { rawConnectorSchemaV3, rawConnectorSchemaV4 } from '../schemas/raw_connector';
import { connectorModelVersions } from './connector_model_versions';
import { actionEncryptedRegistrationV2, actionEncryptedRegistrationV3 } from '../action_encryption';

describe('Connector Model Versions', () => {
  const encryptedSavedObjects = encryptedSavedObjectsMock.createSetup();
  const versions = connectorModelVersions(encryptedSavedObjects);

  describe('version 1', () => {
    it('has correct structure', () => {
      const version1 = versions['1'] as SavedObjectsFullModelVersion;
      expect(version1).toBeDefined();
      expect(version1.changes).toEqual([]);
      expect(version1.schemas).toBeDefined();
      expect(version1.schemas?.create).toBeDefined();
    });
  });

  describe('version 2', () => {
    const version2 = versions['2'] as SavedObjectsFullModelVersion;
    const context: SavedObjectModelTransformationContext = {
      log: {
        get: () => ({ debug: jest.fn(), info: jest.fn(), warn: jest.fn() }),
      } as unknown as Logger,
      modelVersion: 2,
      namespaceType: 'single',
    };

    it('has correct structure', () => {
      expect(version2).toBeDefined();
      expect(version2.changes).toHaveLength(1);
      expect(version2.changes[0].type).toBe('data_backfill');
      expect(version2.schemas).toBeDefined();
      expect(version2.schemas?.create).toBeDefined();
      expect(version2.schemas?.forwardCompatibility).toBeDefined();
    });

    describe('backfillFn', () => {
      const backfillChange = version2.changes.find((change) => change.type === 'data_backfill');
      const backfillFn =
        backfillChange && backfillChange.type === 'data_backfill'
          ? backfillChange.backfillFn
          : undefined;

      it('exists', () => {
        expect(backfillFn).toBeDefined();
        expect(typeof backfillFn).toBe('function');
      });

      it('adds authMode "shared" correctly', () => {
        const mockDocument = {
          id: 'test-connector-id',
          type: 'action',
          attributes: {
            actionTypeId: '.slack',
            name: 'Test Connector',
            isMissingSecrets: false,
            config: {
              authType: 'apiKey',
              url: 'https://example.com',
            },
            secrets: '{}',
          },
          references: [],
          migrationVersion: {},
          coreMigrationVersion: '8.0.0',
          typeMigrationVersion: '8.0.0',
          updated_at: '2024-01-01T00:00:00.000Z',
          version: '1',
          namespaces: ['default'],
        };

        const result = backfillFn!(mockDocument, context);

        expect(result).toEqual({
          ...mockDocument,
          attributes: {
            ...mockDocument.attributes,
            authMode: 'shared',
          },
        });
      });

      it('does not overwrite existing authMode if already present', () => {
        const mockDocument = {
          id: 'test-connector-id',
          type: 'action',
          attributes: {
            actionTypeId: '.webhook',
            name: 'Test Webhook',
            isMissingSecrets: false,
            config: {
              authType: 'bearer',
              url: 'https://example.com',
            },
            secrets: '{}',
            authMode: 'per-user' as const,
          },
          references: [],
          migrationVersion: {},
          coreMigrationVersion: '8.0.0',
          typeMigrationVersion: '8.0.0',
          updated_at: '2024-01-01T00:00:00.000Z',
          version: '1',
          namespaces: ['default'],
        };

        const result = backfillFn!(mockDocument, context);

        expect(result).toEqual({
          ...mockDocument,
        });
      });
    });
  });

  describe('version 3', () => {
    it('wraps the model version with createModelVersion for the new encrypted attributes', () => {
      expect(encryptedSavedObjects.createModelVersion).toHaveBeenCalledWith(
        expect.objectContaining({
          inputType: actionEncryptedRegistrationV2,
          outputType: actionEncryptedRegistrationV3,
          shouldTransformIfDecryptionFails: true,
        })
      );
    });

    it('has a no-op backfill to trigger re-encryption', () => {
      const version3 = versions['3'] as SavedObjectsFullModelVersion;
      expect(version3.changes).toHaveLength(1);
      expect(version3.changes[0].type).toBe('data_backfill');
      expect(version3.schemas?.create).toBeDefined();
      expect(version3.schemas?.forwardCompatibility).toBeDefined();
    });

    it('leaves existing documents unchanged so old docs still decrypt', () => {
      const version3 = versions['3'] as SavedObjectsFullModelVersion;
      const backfillChange = version3.changes.find((change) => change.type === 'data_backfill');
      const backfillFn =
        backfillChange && backfillChange.type === 'data_backfill'
          ? backfillChange.backfillFn
          : undefined;
      const mockDocument = {
        id: 'old-connector',
        type: 'action',
        attributes: {
          actionTypeId: '.inboundWebhook',
          name: 'legacy',
          isMissingSecrets: false,
          config: {},
          secrets: '{}',
        },
        references: [],
      };

      expect(
        backfillFn!(mockDocument as never, {
          log: { get: () => ({ debug: jest.fn() }) } as never,
          modelVersion: 3,
          namespaceType: 'single',
        })
      ).toBe(mockDocument);
    });
  });

  describe('version 4', () => {
    it('decrypts with the v3 registration before reading apiKey', () => {
      expect(encryptedSavedObjects.createModelVersion).toHaveBeenCalledWith(
        expect.objectContaining({
          inputType: actionEncryptedRegistrationV3,
          outputType: actionEncryptedRegistrationV3,
        })
      );
    });

    const version4 = versions['4'] as SavedObjectsFullModelVersion;
    const context: SavedObjectModelTransformationContext = {
      log: {
        get: () => ({ debug: jest.fn(), info: jest.fn(), warn: jest.fn() }),
      } as unknown as Logger,
      modelVersion: 4,
      namespaceType: 'single',
    };

    it('backfills the unencrypted inbound identity presence flag', () => {
      const backfillChange = version4.changes.find((change) => change.type === 'data_backfill');
      const backfillFn =
        backfillChange && backfillChange.type === 'data_backfill'
          ? backfillChange.backfillFn
          : undefined;
      const mockDocument = {
        id: 'old-connector',
        type: 'action',
        attributes: {
          actionTypeId: '.datadog',
          name: 'legacy',
          isMissingSecrets: false,
          config: {},
          secrets: '{}',
        },
        references: [],
      };

      expect(backfillFn!(mockDocument, context)).toEqual({
        ...mockDocument,
        attributes: {
          ...mockDocument.attributes,
          hasInboundEventIdentity: false,
        },
      });
    });

    it('backfills true when encrypted inbound identity is already stored', () => {
      const backfillChange = version4.changes.find((change) => change.type === 'data_backfill');
      const backfillFn =
        backfillChange && backfillChange.type === 'data_backfill'
          ? backfillChange.backfillFn
          : undefined;
      const mockDocument = {
        id: 'dual-with-identity',
        type: 'action',
        attributes: {
          actionTypeId: '.datadog',
          name: 'legacy dual',
          isMissingSecrets: false,
          config: {},
          secrets: '{}',
          apiKey: 'ciphertext-api-key',
          uiamApiKey: null,
        },
        references: [],
      };

      expect(backfillFn!(mockDocument, context)).toEqual({
        ...mockDocument,
        attributes: {
          ...mockDocument.attributes,
          hasInboundEventIdentity: true,
        },
      });
    });

    it('backfills true when only a UIAM inbound identity is stored', () => {
      const backfillChange = version4.changes.find((change) => change.type === 'data_backfill');
      const backfillFn =
        backfillChange && backfillChange.type === 'data_backfill'
          ? backfillChange.backfillFn
          : undefined;
      const mockDocument = {
        id: 'dual-with-uiam',
        type: 'action',
        attributes: {
          actionTypeId: '.datadog',
          name: 'legacy dual',
          isMissingSecrets: false,
          config: {},
          secrets: '{}',
          apiKey: null,
          uiamApiKey: 'ciphertext-uiam-key',
        },
        references: [],
      };

      expect(backfillFn!(mockDocument, context)).toEqual({
        ...mockDocument,
        attributes: {
          ...mockDocument.attributes,
          hasInboundEventIdentity: true,
        },
      });
    });

    it('does not treat an empty apiKey as inbound identity', () => {
      const backfillChange = version4.changes.find((change) => change.type === 'data_backfill');
      const backfillFn =
        backfillChange && backfillChange.type === 'data_backfill'
          ? backfillChange.backfillFn
          : undefined;
      const mockDocument = {
        id: 'empty-identity',
        type: 'action',
        attributes: {
          actionTypeId: '.webhook',
          name: 'Webhook Connector with empty identity fields',
          isMissingSecrets: false,
          config: {},
          secrets: '{}',
          apiKey: '',
          uiamApiKey: null,
        },
        references: [],
      };

      expect(backfillFn!(mockDocument, context)).toEqual({
        ...mockDocument,
        attributes: {
          ...mockDocument.attributes,
          hasInboundEventIdentity: false,
        },
      });
    });

    it('does not overwrite an existing presence flag', () => {
      const backfillChange = version4.changes.find((change) => change.type === 'data_backfill');
      const backfillFn =
        backfillChange && backfillChange.type === 'data_backfill'
          ? backfillChange.backfillFn
          : undefined;
      const mockDocument = {
        id: 'enabled-connector',
        type: 'action',
        attributes: {
          actionTypeId: '.datadog',
          name: 'enabled',
          isMissingSecrets: false,
          config: {},
          secrets: '{}',
          hasInboundEventIdentity: true,
        },
        references: [],
      };

      expect(backfillFn!(mockDocument, context)).toBe(mockDocument);
    });

    it('migrates the 10.4.0 action fixtures from v3 documents', () => {
      const backfillChange = version4.changes.find((change) => change.type === 'data_backfill');
      const backfillFn =
        backfillChange && backfillChange.type === 'data_backfill'
          ? backfillChange.backfillFn
          : undefined;
      const fixturePath = join(
        __dirname,
        '../../../../../../../../packages/kbn-check-saved-objects-cli/src/migrations/__fixtures__/action/10.4.0.json'
      );
      const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as {
        '10.3.0': Array<Record<string, unknown>>;
        '10.4.0': Array<Record<string, unknown>>;
      };

      expect(fixture['10.3.0']).toHaveLength(fixture['10.4.0'].length);
      fixture['10.3.0'].forEach((previous, index) => {
        expect(rawConnectorSchemaV3.validate(previous)).toEqual(previous);
        const migrated = backfillFn!(
          {
            id: `fixture-${index}`,
            type: 'action',
            attributes: previous,
            references: [],
          },
          context
        );
        expect(migrated.attributes).toEqual(fixture['10.4.0'][index]);
        expect(rawConnectorSchemaV4.validate(fixture['10.4.0'][index])).toEqual(
          fixture['10.4.0'][index]
        );
      });
    });
  });
});
