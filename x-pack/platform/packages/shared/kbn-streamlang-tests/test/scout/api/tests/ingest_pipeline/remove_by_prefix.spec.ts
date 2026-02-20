/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import type { RemoveByPrefixProcessor, StreamlangDSL } from '@kbn/streamlang';
import { transpile } from '@kbn/streamlang/src/transpilers/ingest_pipeline';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe(
  'Streamlang to Ingest Pipeline - RemoveByPrefix Processor',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    apiTest('should remove a field', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-remove-by-prefix-basic';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'remove_by_prefix',
            from: 'temp_field',
          } as RemoveByPrefixProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [{ temp_field: 'to-be-removed', message: 'keep-this' }];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(1);
      const source = ingestedDocs[0];
      expect(source?.temp_field).toBeUndefined();
      expect(source?.message).toBe('keep-this');
    });

    apiTest('should remove a field and all nested fields (subobjects)', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-remove-by-prefix-nested';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'remove_by_prefix',
            from: 'host',
          } as RemoveByPrefixProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [
        {
          host: {
            name: 'server01',
            ip: '192.168.1.1',
            os: {
              platform: 'linux',
              version: '20.04',
            },
          },
          message: 'keep-this',
        },
      ];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(1);
      const source = ingestedDocs[0];
      expect(source?.host).toBeUndefined();
      expect(source?.['host.name']).toBeUndefined();
      expect(source?.['host.ip']).toBeUndefined();
      expect(source?.['host.os']).toBeUndefined();
      expect(source?.['host.os.platform']).toBeUndefined();
      expect(source?.['host.os.version']).toBeUndefined();
      expect(source?.message).toBe('keep-this');
    });

    apiTest('should remove flattened fields with prefix', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-remove-by-prefix-flattened';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'remove_by_prefix',
            from: 'labels',
          } as RemoveByPrefixProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      // Create docs with flattened field structure
      const docs = [
        {
          'labels.env': 'production',
          'labels.team': 'platform',
          'labels.version': '1.0',
          message: 'keep-this',
        },
      ];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(1);
      const source = ingestedDocs[0];
      expect(source?.labels).toBeUndefined();
      expect(source?.['labels.env']).toBeUndefined();
      expect(source?.['labels.team']).toBeUndefined();
      expect(source?.['labels.version']).toBeUndefined();
      expect(source?.message).toBe('keep-this');
    });

    apiTest(
      'should remove the parent field itself when using dotted notation',
      async ({ testBed }) => {
        const indexName = 'streams-e2e-test-remove-by-prefix-delete-parent-dotted';

        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'remove_by_prefix',
              from: 'metadata.user',
            } as RemoveByPrefixProcessor,
          ],
        };

        const { processors } = transpile(streamlangDSL);

        const docs = [
          {
            'metadata.user.id': '123',
            'metadata.user.name': 'john',
            'metadata.timestamp': '2025-01-01',
            message: 'keep-this',
          },
        ];
        await testBed.ingest(indexName, docs, processors);

        const ingestedDocs = await testBed.getDocs(indexName);
        expect(ingestedDocs).toHaveLength(1);
        const source = ingestedDocs[0];
        // Parent field and all nested fields removed
        expect(source?.['metadata.user']).toBeUndefined();
        expect(source?.['metadata.user.id']).toBeUndefined();
        expect(source?.['metadata.user.name']).toBeUndefined();
        // Other metadata fields kept (as dotted notation - accessed with bracket notation)
        expect(source['metadata.timestamp']).toBe('2025-01-01');
        expect(source?.message).toBe('keep-this');
      }
    );

    apiTest('should remove the parent field itself when using subobjects', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-remove-by-prefix-delete-parent-subobjects';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'remove_by_prefix',
            from: 'metadata.user',
          } as RemoveByPrefixProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [
        {
          metadata: {
            user: {
              id: '123',
              name: 'john',
            },
            timestamp: '2025-01-01',
          },
          message: 'keep-this',
        },
      ];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(1);
      const source = ingestedDocs[0];
      // Parent field and all nested fields removed
      expect(source?.['metadata.user']).toBeUndefined();
      expect(source?.['metadata.user.id']).toBeUndefined();
      expect(source?.['metadata.user.name']).toBeUndefined();
      // Other metadata fields kept (as nested object)
      expect(source?.metadata).toBeDefined();
      expect(source.metadata?.timestamp).toBe('2025-01-01');
      expect(source?.message).toBe('keep-this');
    });

    apiTest('should remove flattened fields within a nested subobject', async ({ testBed }) => {
      const indexName = 'streams-e2e-test-remove-by-prefix-nested-with-flattened';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'remove_by_prefix',
            from: 'attributes.foo.bar',
          } as RemoveByPrefixProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [
        {
          attributes: {
            'foo.bar': 123,
            'foo.bar.xyz': 123,
            'foo.bar.xyz2': 456,
            'foo.bar.xyz2.234': 456,
            'foo.baz': 789, // Should NOT be removed
          },
          message: 'keep-this',
        },
      ];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs).toHaveLength(1);
      const source = ingestedDocs[0];
      // All foo.bar* fields removed from attributes
      expect(source.attributes?.['foo.bar']).toBeUndefined();
      expect(source.attributes?.['foo.bar.xyz']).toBeUndefined();
      expect(source.attributes?.['foo.bar.xyz2']).toBeUndefined();
      expect(source.attributes?.['foo.bar.xyz2.234']).toBeUndefined();
      // Other fields kept
      expect(source.attributes['foo.baz']).toBe(789);
      expect(source?.message).toBe('keep-this');
    });

    apiTest(
      'should remove flattened fields within a deeply nested subobject',
      async ({ testBed }) => {
        const indexName = 'streams-e2e-test-remove-by-prefix-deeply-nested-with-flattened';

        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'remove_by_prefix',
              from: 'resource.attributes.foo.bar',
            } as RemoveByPrefixProcessor,
          ],
        };

        const { processors } = transpile(streamlangDSL);

        const docs = [
          {
            resource: {
              attributes: {
                'foo.bar': 123,
                'foo.bar.xyz': 123,
                'foo.bar.xyz2': 456,
                'foo.bar.xyz2.234': 456,
                'foo.baz': 789, // Should NOT be removed
              },
            },
            message: 'keep-this',
          },
        ];
        await testBed.ingest(indexName, docs, processors);

        const ingestedDocs = await testBed.getDocs(indexName);
        expect(ingestedDocs).toHaveLength(1);
        const source = ingestedDocs[0];
        // All foo.bar* fields removed from resource.attributes
        expect(source.resource.attributes?.['foo.bar']).toBeUndefined();
        expect(source.resource.attributes?.['foo.bar.xyz']).toBeUndefined();
        expect(source.resource.attributes?.['foo.bar.xyz2']).toBeUndefined();
        expect(source.resource.attributes?.['foo.bar.xyz2.234']).toBeUndefined();
        // Other fields kept
        expect(source.resource.attributes['foo.baz']).toBe(789);
        expect(source?.message).toBe('keep-this');
      }
    );

    [
      {
        templateField: 'host.{{field_name}}',
        description: 'should reject {{ }} template syntax in field names',
      },
      {
        templateField: 'host.{{{field_name}}}',
        description: 'should reject {{{ }}} template syntax in field names',
      },
    ].forEach(({ templateField, description }) => {
      apiTest(`${description}`, async () => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'remove_by_prefix',
              from: templateField,
            } as RemoveByPrefixProcessor,
          ],
        };

        expect(() => {
          transpile(streamlangDSL);
        }).toThrow('Mustache template syntax {{ }} or {{{ }}} is not allowed');
      });
    });
  }
);
