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
});
