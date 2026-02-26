/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import { generateLayer } from './generate_layer';
import { otelEquivalentLookupMap } from './logs_layer';

describe('generateLayer', () => {
  const definition: Streams.WiredStream.Definition = {
    name: 'logs.abc',
    description: '',
    updated_at: new Date().toISOString(),
    ingest: {
      processing: { steps: [], updated_at: new Date().toISOString() },
      wired: {
        routing: [],
        fields: {
          '@timestamp': { type: 'date', format: 'strict_date_optional_time' },
          message: { type: 'match_only_text' },
          'attributes.myfield': { type: 'keyword' },
        },
      },
      lifecycle: {
        // simulate DSL lifecycle
        dsl: { data_retention: '30d' },
      },
      settings: {},
      failure_store: { inherit: {} },
    },
  };

  it('should generate mappings with proper handling of fields using passthrough', () => {
    const result = generateLayer('logs.abc', definition, false);
    expect(result).toMatchInlineSnapshot(`
      Object {
        "_meta": Object {
          "description": "Default settings for the logs.abc stream",
          "managed": true,
        },
        "name": "logs.abc@stream.layer",
        "template": Object {
          "mappings": Object {
            "dynamic": false,
            "properties": Object {
              "@timestamp": Object {
                "format": "strict_date_optional_time",
                "ignore_malformed": false,
                "type": "date",
              },
              "attributes": Object {
                "priority": 20,
                "properties": Object {
                  "myfield": Object {
                    "type": "keyword",
                  },
                },
                "type": "passthrough",
              },
              "message": Object {
                "type": "match_only_text",
              },
            },
          },
          "settings": Object {},
        },
        "version": 1,
      }
    `);
  });

  it('should generate mappings for root stream with passthrough namespaces', () => {
    const result = generateLayer('logs', { ...definition, name: 'logs' }, true);
    expect(result).toMatchInlineSnapshot(`
      Object {
        "_meta": Object {
          "description": "Default settings for the logs stream",
          "managed": true,
        },
        "name": "logs@stream.layer",
        "template": Object {
          "mappings": Object {
            "dynamic": false,
            "properties": Object {
              "@timestamp": Object {
                "format": "strict_date_optional_time",
                "ignore_malformed": false,
                "type": "date",
              },
              "attributes": Object {
                "priority": 20,
                "properties": Object {
                  "myfield": Object {
                    "type": "keyword",
                  },
                },
                "type": "passthrough",
              },
              "body": Object {
                "properties": Object {
                  "structured": Object {
                    "priority": 10,
                    "type": "passthrough",
                  },
                },
                "type": "object",
              },
              "log.level": Object {
                "path": "severity_text",
                "type": "alias",
              },
              "message": Object {
                "type": "match_only_text",
              },
              "resource": Object {
                "properties": Object {
                  "attributes": Object {
                    "priority": 40,
                    "properties": Object {
                      "host.name": Object {
                        "type": "keyword",
                      },
                      "service.name": Object {
                        "type": "keyword",
                      },
                    },
                    "type": "passthrough",
                  },
                },
                "type": "object",
              },
              "scope": Object {
                "properties": Object {
                  "attributes": Object {
                    "priority": 30,
                    "type": "passthrough",
                  },
                },
                "type": "object",
              },
              "span.id": Object {
                "path": "span_id",
                "type": "alias",
              },
              "trace.id": Object {
                "path": "trace_id",
                "type": "alias",
              },
            },
          },
          "settings": Object {
            "index": Object {
              "codec": "best_compression",
              "mapping": Object {
                "ignore_malformed": true,
                "total_fields": Object {
                  "ignore_dynamic_beyond_limit": true,
                },
              },
              "mode": "logsdb",
              "sort": Object {
                "field": Array [
                  "resource.attributes.host.name",
                  "@timestamp",
                ],
                "order": Array [
                  "asc",
                  "desc",
                ],
              },
            },
          },
        },
        "version": 1,
      }
    `);
  });

  it('should generate valid mappings with hierarchical field names using passthrough', () => {
    // This test verifies that passthrough type is used for namespace objects,
    // which allows Elasticsearch to handle field patterns like "client" + "client.ip"
    // and automatically creates aliases.
    const definitionWithHierarchicalFields: Streams.WiredStream.Definition = {
      name: 'logs.test',
      description: '',
      updated_at: new Date().toISOString(),
      ingest: {
        processing: { steps: [], updated_at: new Date().toISOString() },
        wired: {
          routing: [],
          fields: {
            '@timestamp': { type: 'date' },
            'attributes.client': { type: 'keyword' },
            'attributes.client.ip': { type: 'ip' },
          },
        },
        lifecycle: { inherit: {} },
        settings: {},
        failure_store: { inherit: {} },
      },
    };

    const result = generateLayer('logs.test', definitionWithHierarchicalFields, false);

    // Verify the structure uses passthrough for the attributes namespace
    const properties = result.template.mappings?.properties as Record<string, unknown>;
    const attributes = properties.attributes as {
      type: string;
      priority: number;
      properties: Record<string, unknown>;
    };

    expect(attributes.type).toBe('passthrough');
    expect(attributes.priority).toBe(20); // Fixed priority for attributes namespace
    expect(attributes.properties.client).toEqual({ type: 'keyword' });
    expect(attributes.properties['client.ip']).toEqual({ type: 'ip' });
  });

  it('should create OTel-to-ECS equivalent aliases when applicable', () => {
    // Find a real OTel → ECS mapping from the lookup map
    const otelMappings = Object.entries(otelEquivalentLookupMap);

    if (otelMappings.length === 0) {
      return;
    }

    const [otelField, ecsField] = otelMappings[0];
    const fullOtelField = `attributes.${otelField}`;

    const definitionWithOtelField: Streams.WiredStream.Definition = {
      name: 'logs.otel',
      description: '',
      updated_at: new Date().toISOString(),
      ingest: {
        processing: { steps: [], updated_at: new Date().toISOString() },
        wired: {
          routing: [],
          fields: {
            '@timestamp': { type: 'date' },
            [fullOtelField]: { type: 'keyword' },
          },
        },
        lifecycle: { inherit: {} },
        settings: {},
        failure_store: { inherit: {} },
      },
    };

    const result = generateLayer('logs.otel', definitionWithOtelField, false);
    const properties = result.template.mappings?.properties as Record<string, unknown>;

    // Verify the ECS equivalent alias was created
    expect(properties[ecsField]).toEqual({
      type: 'alias',
      path: fullOtelField,
    });
  });

  describe('Root stream mappings', () => {
    it('should use OTel mappings for OTel-based root streams (logs, logs.otel)', () => {
      const otelStreams = ['logs', 'logs.otel'];

      otelStreams.forEach((streamName) => {
        // Create definition without explicit message field to test alias behavior
        const rootDefinition: Streams.WiredStream.Definition = {
          name: streamName,
          description: '',
          updated_at: new Date().toISOString(),
          ingest: {
            processing: { steps: [], updated_at: new Date().toISOString() },
            wired: {
              routing: [],
              fields: {
                '@timestamp': { type: 'date' },
                'attributes.myfield': { type: 'keyword' },
              },
            },
            lifecycle: { dsl: { data_retention: '30d' } },
            settings: {},
            failure_store: { inherit: {} },
          },
        };

        const result = generateLayer(streamName, rootDefinition, false);
        const properties = result.template.mappings?.properties as Record<string, unknown>;

        // OTel streams use OTel mappings with passthrough namespaces
        expect(properties.body).toBeDefined();
        expect(properties.resource).toBeDefined();
        expect(properties.scope).toBeDefined();
        expect(properties.attributes).toBeDefined();

        // OTel streams include ECS aliases
        expect(properties['log.level']).toEqual({
          path: 'severity_text',
          type: 'alias',
        });
        expect(properties.message).toEqual({
          path: 'body.text',
          type: 'alias',
        });
      });
    });

    it('should NOT use OTel mappings for logs.ecs root stream', () => {
      const rootDefinition: Streams.WiredStream.Definition = {
        ...definition,
        name: 'logs.ecs',
      };

      const result = generateLayer('logs.ecs', rootDefinition, false);
      const properties = result.template.mappings?.properties as Record<string, unknown>;

      // logs.ecs should NOT have OTel passthrough namespaces
      expect(properties.body).toBeUndefined();
      expect(properties.resource).toBeUndefined();
      expect(properties.scope).toBeUndefined();

      // logs.ecs should NOT have OTel aliases (log.level -> severity_text)
      expect(properties['log.level']).toBeUndefined();

      // logs.ecs only has raw fields from the stream definition (no OTel passthrough transformation)
      expect(properties.message).toEqual({
        type: 'match_only_text',
      });
      expect(properties['@timestamp']).toEqual({
        format: 'strict_date_optional_time',
        ignore_malformed: false,
        type: 'date',
      });
      // Raw field from stream definition (not transformed into passthrough structure)
      expect(properties['attributes.myfield']).toEqual({
        type: 'keyword',
      });
      // No attributes passthrough object for ECS streams
      expect(properties.attributes).toBeUndefined();
    });

    it('should use OTel settings for OTel-based root streams', () => {
      const otelStreams = ['logs', 'logs.otel'];

      otelStreams.forEach((streamName) => {
        const rootDefinition: Streams.WiredStream.Definition = {
          ...definition,
          name: streamName,
        };

        const result = generateLayer(streamName, rootDefinition, false);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const settings = result.template.settings as any;

        // OTel streams use logsdb mode with OTel sort fields
        expect(settings.index.mode).toBe('logsdb');
        expect(settings.index.sort.field).toEqual(['resource.attributes.host.name', '@timestamp']);
      });
    });

    it('should use ECS settings for logs.ecs root stream', () => {
      const rootDefinition: Streams.WiredStream.Definition = {
        ...definition,
        name: 'logs.ecs',
      };

      const result = generateLayer('logs.ecs', rootDefinition, false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const settings = result.template.settings as any;

      expect(settings.index.mode).toBe('logsdb');
      expect(settings.index.sort.field).toEqual(['host.name', '@timestamp']);
    });

    it('should include OTel aliases for child streams of OTel-based roots', () => {
      const otelChildStreams = ['logs.child', 'logs.otel.child'];

      otelChildStreams.forEach((streamName) => {
        const childDefinition: Streams.WiredStream.Definition = {
          ...definition,
          name: streamName,
        };

        const result = generateLayer(streamName, childDefinition, false);
        const properties = result.template.mappings?.properties as Record<string, unknown>;

        // Child streams of OTel roots inherit OTel alias behavior
        const hasOtelAliases =
          Object.values(properties).some(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (prop: any) => prop?.type === 'alias' && prop?.path?.includes('attributes.')
          ) || properties.attributes;

        expect(hasOtelAliases).toBeTruthy();
      });
    });

    it('should NOT include OTel aliases for child streams of logs.ecs', () => {
      const ecsChildDefinition: Streams.WiredStream.Definition = {
        ...definition,
        name: 'logs.ecs.child',
      };

      const result = generateLayer('logs.ecs.child', ecsChildDefinition, false);
      const properties = result.template.mappings?.properties as Record<string, unknown>;

      // Child streams of logs.ecs should NOT have OTel-to-ECS aliases
      const hasOtelAliases = Object.values(properties).some(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (prop: any) => prop?.type === 'alias' && prop?.path?.includes('attributes.')
      );

      expect(hasOtelAliases).toBeFalsy();

      // ECS child streams use raw properties (no passthrough transformation)
      expect(properties['attributes.myfield']).toEqual({
        type: 'keyword',
      });
      // No attributes passthrough object for ECS streams
      expect(properties.attributes).toBeUndefined();
    });
  });
});
