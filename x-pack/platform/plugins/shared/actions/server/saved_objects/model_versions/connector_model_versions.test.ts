/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObjectModelTransformationContext,
  SavedObjectsFullModelVersion,
} from '@kbn/core-saved-objects-server';
import type { Logger } from '@kbn/core/server';
import { connectorModelVersions } from './connector_model_versions';

describe('Connector Model Versions', () => {
  describe('version 1', () => {
    it('has correct structure', () => {
      const version1 = connectorModelVersions['1'] as SavedObjectsFullModelVersion;
      expect(version1).toBeDefined();
      expect(version1.changes).toEqual([]);
      expect(version1.schemas).toBeDefined();
      expect(version1.schemas?.create).toBeDefined();
    });
  });

  describe('version 2', () => {
    const version2 = connectorModelVersions['2'] as SavedObjectsFullModelVersion;
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
});
