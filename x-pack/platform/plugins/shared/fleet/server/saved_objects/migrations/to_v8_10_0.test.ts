/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectModelTransformationContext } from '@kbn/core-saved-objects-server';

import {
  migrateOutputToV8100 as migration,
  migrateOutputEvictionsFromV8100 as eviction,
} from './to_v8_10_0';

describe('8.10.0 migration', () => {
  describe('Migrate output to v8.10.0', () => {
    const outputDoc = (connectionType = {}) => ({
      id: 'mock-saved-object-id',
      attributes: {
        id: 'id',
        name: 'Test',
        type: 'kafka' as const,
        is_default: false,
        is_default_monitoring: false,
        hosts: ['localhost:9092'],
        ca_sha256: 'sha',
        ca_trusted_fingerprint: 'fingerprint',
        version: '7.10.0',
        key: 'key',
        compression: 'gzip' as const,
        compression_level: 4,
        client_id: 'Elastic',
        auth_type: 'none' as const,
        ...connectionType,
        topics: [{ topic: 'topic' }],
      },
      type: 'nested',
    });

    it('adds connection type field to output and sets it to plaintext', () => {
      const initialDoc = outputDoc({});

      const migratedDoc = outputDoc({
        connection_type: 'plaintext',
      });

      expect(migration(initialDoc, {} as SavedObjectModelTransformationContext)).toEqual({
        attributes: migratedDoc.attributes,
      });
    });

    it('removes connection type field from output', () => {
      const initialDoc = outputDoc({
        connection_type: 'plaintext',
      });

      const migratedDoc = outputDoc({});

      expect(eviction(initialDoc.attributes)).toEqual(migratedDoc.attributes);
    });
  });
});
