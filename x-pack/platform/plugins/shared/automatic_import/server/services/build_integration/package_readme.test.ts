/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataStreamAttributes, IntegrationAttributes } from '../saved_objects/schemas/types';
import type { FieldMappingEntry } from '../saved_objects/saved_objects_service';
import { buildReadme } from './package_readme';

const baseIntegration = (): IntegrationAttributes => ({
  integration_id: 'my_integration',
  created_by: 'user',
  metadata: {
    title: 'My Integration',
    description: 'Collects logs from my app.',
    version: '1.0.0',
  },
});

const baseDataStream = (overrides: Partial<DataStreamAttributes> = {}): DataStreamAttributes => ({
  integration_id: 'my_integration',
  data_stream_id: 'logs',
  created_by: 'user',
  title: 'Logs',
  description: 'Application logs.',
  input_types: ['filestream'],
  job_info: {
    job_id: 'job-1',
    job_type: 'import',
    status: 'completed',
  },
  metadata: {},
  ...overrides,
});

describe('buildReadme', () => {
  it('renders integration header and multiple data streams with example and exported fields', () => {
    const integration = baseIntegration();
    const ds1 = baseDataStream({
      data_stream_id: 'logs',
      title: 'Logs',
      result: {
        pipeline_docs: [{ message: 'hello', 'source.ip': '10.0.0.1' }],
        field_mapping: [
          { name: 'z_custom', type: 'keyword', is_ecs: false },
          { name: 'source.ip', type: 'ip', is_ecs: true },
          { name: 'event.action', type: 'keyword', is_ecs: true },
        ],
      },
    });
    const ds2 = baseDataStream({
      data_stream_id: 'audit',
      title: 'Audit',
      description: 'Audit trail.',
      result: {
        pipeline_docs: [{ action: 'login' }],
        field_mapping: [{ name: 'custom.audit', type: 'keyword', is_ecs: false }],
      },
    });
    const map = new Map<string, FieldMappingEntry[]>([
      ['logs', ds1.result!.field_mapping!],
      ['audit', ds2.result!.field_mapping!],
    ]);

    const markdown = buildReadme(integration, [ds1, ds2], map);

    expect(markdown).toContain('# My Integration');
    expect(markdown).toContain('Collects logs from my app.');
    expect(markdown).toContain('## Logs');
    expect(markdown).toContain('Application logs.');
    expect(markdown).toContain('An example event for `logs`');
    expect(markdown).toContain('"message": "hello"');
    expect(markdown).toContain('<summary>Exported fields</summary>');
    expect(markdown).toContain('## Audit');
    expect(markdown).toContain('Audit trail.');
    expect(markdown).toContain('| Field | Type |');
    expect(markdown).toContain('| event.action | keyword |');
    expect(markdown).toContain('| source.ip | ip |');
    expect(markdown).toContain('| z_custom | keyword |');
    const auditSection = markdown.split('## Audit')[1] ?? '';
    expect(auditSection).toContain('| custom.audit | keyword |');
  });

  it('omits Example when pipeline_docs is missing or empty', () => {
    const integration = baseIntegration();
    const ds = baseDataStream({
      result: {
        field_mapping: [{ name: 'foo', type: 'keyword', is_ecs: false }],
      },
    });
    const map = new Map<string, FieldMappingEntry[]>([['logs', ds.result!.field_mapping!]]);

    const markdown = buildReadme(integration, [ds], map);

    expect(markdown).not.toContain('An example event for');
    expect(markdown).toContain('<summary>Exported fields</summary>');
    expect(markdown).toContain('| Field | Type |');
  });

  it('omits Exported Fields when field mapping is empty', () => {
    const integration = baseIntegration();
    const ds = baseDataStream({
      result: {
        pipeline_docs: [{ a: 1 }],
      },
    });
    const map = new Map<string, FieldMappingEntry[]>([['logs', []]]);

    const markdown = buildReadme(integration, [ds], map);

    expect(markdown).toContain('An example event for `logs`');
    expect(markdown).toContain('"a": 1');
    expect(markdown).not.toContain('<summary>Exported fields</summary>');
    expect(markdown).not.toContain('| Field | Type |');
  });

  it('renders only integration section when there are no data streams', () => {
    const integration = baseIntegration();
    const markdown = buildReadme(integration, [], new Map());

    expect(markdown.trim()).toBe(`# My Integration

Collects logs from my app.`);
  });

  it('renders custom field name and type', () => {
    const integration = baseIntegration();
    const ds = baseDataStream({
      result: {
        field_mapping: [{ name: 'acme.custom_field', type: 'keyword', is_ecs: false }],
      },
    });
    const map = new Map<string, FieldMappingEntry[]>([['logs', ds.result!.field_mapping!]]);

    const markdown = buildReadme(integration, [ds], map);

    expect(markdown).toContain('| acme.custom_field | keyword |');
  });

  it('sorts exported fields alphabetically by name', () => {
    const integration = baseIntegration();
    const ds = baseDataStream({
      result: {
        field_mapping: [
          { name: 'zebra', type: 'keyword', is_ecs: false },
          { name: 'apple', type: 'keyword', is_ecs: false },
          { name: 'mango', type: 'keyword', is_ecs: false },
        ],
      },
    });
    const map = new Map<string, FieldMappingEntry[]>([['logs', ds.result!.field_mapping!]]);

    const markdown = buildReadme(integration, [ds], map);
    const tableStart = markdown.indexOf('| Field | Type |');
    const table = markdown.slice(tableStart);
    const appleIdx = table.indexOf('| apple |');
    const mangoIdx = table.indexOf('| mango |');
    const zebraIdx = table.indexOf('| zebra |');
    expect(appleIdx).toBeLessThan(mangoIdx);
    expect(mangoIdx).toBeLessThan(zebraIdx);
  });
});
