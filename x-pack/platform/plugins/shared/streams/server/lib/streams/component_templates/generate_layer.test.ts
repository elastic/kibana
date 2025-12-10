/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import { generateLayer } from './generate_layer';

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

  it('should generate mappings with proper handling of fields and aliases', () => {
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
              "attributes.myfield": Object {
                "type": "keyword",
              },
              "message": Object {
                "type": "match_only_text",
              },
              "myfield": Object {
                "path": "attributes.myfield",
                "type": "alias",
              },
            },
            "subobjects": false,
          },
          "settings": Object {},
        },
        "version": 1,
      }
    `);
  });

  it('should generate mappings for root stream', () => {
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
                "subobjects": false,
                "type": "object",
              },
              "attributes.myfield": Object {
                "type": "keyword",
              },
              "body": Object {
                "properties": Object {
                  "structured": Object {
                    "subobjects": false,
                    "type": "object",
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
              "myfield": Object {
                "path": "attributes.myfield",
                "type": "alias",
              },
              "resource": Object {
                "properties": Object {
                  "attributes": Object {
                    "subobjects": false,
                    "type": "object",
                  },
                },
                "type": "object",
              },
              "scope": Object {
                "properties": Object {
                  "attributes": Object {
                    "subobjects": false,
                    "type": "object",
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
            "subobjects": false,
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

  it('should generate valid mappings with hierarchical field names (e.g., foo and foo.bar)', () => {
    // This test verifies that subobjects: false is set at the mappings level,
    // which allows Elasticsearch to accept field patterns like "foo" + "foo.bar"
    // without treating them as conflicting object/non-object mappings.
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

    // Verify subobjects: false is set at the mappings level
    expect(result.template.mappings).toHaveProperty('subobjects', false);

    // Verify both fields are present (using bracket notation since keys contain dots)
    const properties = result.template.mappings?.properties as Record<string, unknown>;
    expect(properties['attributes.client']).toEqual({ type: 'keyword' });
    expect(properties['attributes.client.ip']).toEqual({ type: 'ip' });
  });
});
