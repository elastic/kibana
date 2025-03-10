/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ecsPipelineState } from '../../../__jest__/fixtures/ecs_mapping';
import type { EcsMappingState } from '../../types';
import { createPipeline, generateProcessors } from './pipeline';

const state: EcsMappingState = ecsPipelineState;

describe('Testing pipeline templates', () => {
  it('handle pipeline creation', async () => {
    const pipeline = createPipeline(state);
    expect(pipeline.processors).toEqual([
      {
        set: { field: 'ecs.version', tag: 'set_ecs_version', value: '8.11.0' },
      },
      {
        set: {
          field: 'originalMessage',
          copy_from: 'message',
          tag: 'copy_original_message',
        },
      },
      {
        rename: {
          field: 'originalMessage',
          target_field: 'event.original',
          tag: 'rename_message',
          ignore_missing: true,
          if: 'ctx.event?.original == null',
        },
      },
      {
        remove: {
          field: 'originalMessage',
          ignore_missing: true,
          tag: 'remove_copied_message',
          if: 'ctx.event?.original != null',
        },
      },
      {
        remove: { field: 'message', ignore_missing: true, tag: 'remove_message' },
      },
      {
        json: {
          field: 'event.original',
          tag: 'json_original',
          target_field: 'xdfsfs.ds',
        },
      },
      {
        rename: {
          field: 'xdfsfs.ds.event',
          target_field: 'event.action',
          ignore_missing: true,
        },
      },
      {
        rename: {
          field: 'xdfsfs.ds.uid',
          target_field: 'event.id',
          ignore_missing: true,
        },
      },
      {
        rename: {
          field: 'xdfsfs.ds.code',
          target_field: 'event.code',
          ignore_missing: true,
        },
      },
      {
        date: {
          field: 'xdfsfs.ds.@timestamp',
          target_field: '@timestamp',
          formats: ["yyyy-MM-dd'T'HH:mm:ss.SSSSSSSSS'Z'", 'ISO8601'],
          tag: 'date_processor_xdfsfs.ds.@timestamp',
          if: 'ctx.xdfsfs?.ds?.get("@timestamp") != null',
        },
      },
      {
        rename: {
          field: 'xdfsfs.ds.cluster_name',
          target_field: 'cloud.account.name',
          ignore_missing: true,
        },
      },
      {
        rename: {
          field: 'xdfsfs.ds.identity.user',
          target_field: 'user.name',
          ignore_missing: true,
        },
      },
      {
        rename: {
          field: 'xdfsfs.ds.identity.roles',
          target_field: 'user.roles',
          ignore_missing: true,
        },
      },
      {
        script: {
          description: 'Ensures the date processor does not receive an array value.',
          tag: 'script_convert_array_to_string',
          lang: 'painless',
          source:
            'if (ctx.xdfsfs?.ds?.identity?.expires != null &&\n' +
            '    ctx.xdfsfs.ds.identity.expires instanceof ArrayList){\n' +
            '    ctx.xdfsfs.ds.identity.expires = ctx.xdfsfs.ds.identity.expires[0];\n' +
            '}\n',
        },
      },
      {
        date: {
          field: 'xdfsfs.ds.identity.expires',
          target_field: 'user.changes.name',
          formats: ["yyyy-MM-dd'T'HH:mm:ss.SSSSSSSSS'Z'", 'ISO8601'],
          tag: 'date_processor_xdfsfs.ds.identity.expires',
          if: 'ctx.xdfsfs?.ds?.identity?.expires != null',
        },
      },
      {
        convert: {
          field: 'xdfsfs.ds.identity.client_ip',
          target_field: 'client.ip',
          ignore_missing: true,
          ignore_failure: true,
          type: 'ip',
        },
      },
      {
        script: {
          description: 'Ensures the date processor does not receive an array value.',
          tag: 'script_convert_array_to_string',
          lang: 'painless',
          source:
            'if (ctx.xdfsfs?.ds?.identity?.prev_identity_expires != null &&\n' +
            '    ctx.xdfsfs.ds.identity.prev_identity_expires instanceof ArrayList){\n' +
            '    ctx.xdfsfs.ds.identity.prev_identity_expires = ctx.xdfsfs.ds.identity.prev_identity_expires[0];\n' +
            '}\n',
        },
      },
      {
        date: {
          field: 'xdfsfs.ds.identity.prev_identity_expires',
          target_field: 'event.end',
          formats: ["yyyy-MM-dd'T'HH:mm:ss'Z'", 'ISO8601'],
          tag: 'date_processor_xdfsfs.ds.identity.prev_identity_expires',
          if: 'ctx.xdfsfs?.ds?.identity?.prev_identity_expires != null',
        },
      },
      {
        rename: {
          field: 'xdfsfs.ds.user',
          target_field: 'user.name',
          ignore_missing: true,
        },
      },
      {
        rename: {
          field: 'xdfsfs.ds.login',
          target_field: 'user.id',
          ignore_missing: true,
        },
      },
      {
        rename: {
          field: 'xdfsfs.ds.server_id',
          target_field: 'host.id',
          ignore_missing: true,
        },
      },
      {
        rename: {
          field: 'xdfsfs.ds.server_hostname',
          target_field: 'host.hostname',
          ignore_missing: true,
        },
      },
      {
        rename: {
          field: 'xdfsfs.ds.addr.remote',
          target_field: 'source.address',
          ignore_missing: true,
        },
      },
      {
        rename: {
          field: 'xdfsfs.ds.proto',
          target_field: 'network.protocol',
          ignore_missing: true,
        },
      },
      {
        script: {
          description: 'Drops null/empty values recursively.',
          tag: 'script_drop_null_empty_values',
          lang: 'painless',
          source:
            'boolean dropEmptyFields(Object object) {\n' +
            '  if (object == null || object == "") {\n' +
            '    return true;\n' +
            '  } else if (object instanceof Map) {\n' +
            '    ((Map) object).values().removeIf(value -> dropEmptyFields(value));\n' +
            '    return (((Map) object).size() == 0);\n' +
            '  } else if (object instanceof List) {\n' +
            '    ((List) object).removeIf(value -> dropEmptyFields(value));\n' +
            '    return (((List) object).length == 0);\n' +
            '  }\n' +
            '  return false;\n' +
            '}\n' +
            'dropEmptyFields(ctx);\n',
        },
      },
      {
        geoip: {
          field: 'source.ip',
          tag: 'geoip_source_ip',
          target_field: 'source.geo',
          ignore_missing: true,
        },
      },
      {
        geoip: {
          ignore_missing: true,
          database_file: 'GeoLite2-ASN.mmdb',
          field: 'source.ip',
          tag: 'geoip_source_asn',
          target_field: 'source.as',
          properties: ['asn', 'organization_name'],
        },
      },
      {
        rename: {
          field: 'source.as.asn',
          tag: 'rename_source_as_asn',
          target_field: 'source.as.number',
          ignore_missing: true,
        },
      },
      {
        rename: {
          field: 'source.as.organization_name',
          tag: 'rename_source_as_organization_name',
          target_field: 'source.as.organization.name',
          ignore_missing: true,
        },
      },
      {
        geoip: {
          field: 'destination.ip',
          tag: 'geoip_destination_ip',
          target_field: 'destination.geo',
          ignore_missing: true,
        },
      },
      {
        geoip: {
          database_file: 'GeoLite2-ASN.mmdb',
          field: 'destination.ip',
          tag: 'geoip_destination_asn',
          target_field: 'destination.as',
          properties: ['asn', 'organization_name'],
          ignore_missing: true,
        },
      },
      {
        rename: {
          field: 'destination.as.asn',
          tag: 'rename_destination_as_asn',
          target_field: 'destination.as.number',
          ignore_missing: true,
        },
      },
      {
        rename: {
          field: 'destination.as.organization_name',
          tag: 'rename_destination_as_organization_name',
          target_field: 'destination.as.organization.name',
          ignore_missing: true,
        },
      },
      {
        remove: {
          field: ['xdfsfs.ds.identity.client_ip'],
          ignore_missing: true,
          tag: 'remove_fields',
        },
      },
      {
        remove: {
          field: 'event.original',
          tag: 'remove_original_event',
          if: 'ctx?.tags == null || !(ctx.tags.contains("preserve_original_event"))',
          ignore_failure: true,
          ignore_missing: true,
        },
      },
    ]);
  });

  it('should generate processors for empty mapping', () => {
    const processors = generateProcessors({}, {});
    expect(processors).toEqual([]);
  });

  it('should generate processors for nested fields', () => {
    const mapping = {
      nested: {
        field: {
          target: 'target.field',
          confidence: 0.8,
          type: 'keyword',
          date_formats: [],
        },
      },
    };
    const samples = {
      nested: {
        field: 'test value',
      },
    };

    const processors = generateProcessors(mapping, samples);

    expect(processors).toHaveLength(1);
    expect(processors[0]).toEqual({
      rename: {
        field: 'nested.field',
        target_field: 'target.field',
        ignore_missing: true,
      },
    });
  });
  it('should handle nested fields with mixed target mappings', () => {
    const mapping = {
      level1: {
        no_target: {
          field: {
            target: 'target.field',
            confidence: 0.8,
            type: 'keyword',
            date_formats: [],
          },
        },
      },
    };
    const samples = {
      level1: {
        no_target: {
          field: 'test value',
        },
      },
    };

    const processors = generateProcessors(mapping, samples);

    expect(processors).toHaveLength(1);
    expect(processors[0]).toEqual({
      rename: {
        field: 'level1.no_target.field',
        target_field: 'target.field',
        ignore_missing: true,
      },
    });
  });
  it('should handle multiple nested fields', () => {
    const mapping = {
      level1: {
        level2: {
          level3: {
            field1: {
              target: 'target.field1',
              confidence: 0.8,
              type: 'keyword',
              date_formats: [],
            },
          },
          field2: {
            target: 'target.field2',
            confidence: 0.9,
            type: 'long',
            date_formats: [],
          },
        },
      },
    };
    const samples = {
      level1: {
        level2: {
          field1: 'string value',
          field2: '123',
        },
      },
    };

    const processors = generateProcessors(mapping, samples);

    expect(processors).toHaveLength(2);
    expect(processors[0]).toEqual({
      rename: {
        field: 'level1.level2.level3.field1',
        target_field: 'target.field1',
        ignore_missing: true,
      },
    });
    expect(processors[1]).toEqual({
      rename: {
        field: 'level1.level2.field2',
        target_field: 'target.field2',
        ignore_missing: true,
      },
    });
  });
});
