/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { templateSchema } from './validate_schemas';

describe('templateSchema', () => {
  it('SHOULD accept minimal valid payload', () => {
    const value = templateSchema.validate({
      name: 'test-template',
      indexPatterns: ['logs-*'],
      _kbnMeta: { type: 'default' },
    });
    expect(value).toBeTruthy();
  });

  it('SHOULD reject name that exceeds max length', () => {
    expect(() =>
      templateSchema.validate({
        name: 'x'.repeat(1001),
        indexPatterns: ['logs-*'],
        _kbnMeta: { type: 'default' },
      })
    ).toThrow();
  });

  it('SHOULD reject missing indexPatterns', () => {
    expect(() =>
      templateSchema.validate({
        name: 'test-template',
        _kbnMeta: { type: 'default' },
      })
    ).toThrow();
  });

  it('SHOULD accept empty indexPatterns array', () => {
    // Schema allows empty array - Elasticsearch validation handles this
    const value = templateSchema.validate({
      name: 'test-template',
      indexPatterns: [],
      _kbnMeta: { type: 'default' },
    });
    expect(value).toBeTruthy();
    expect(value.indexPatterns).toEqual([]);
  });

  it('SHOULD require _kbnMeta type field', () => {
    expect(() =>
      templateSchema.validate({
        name: 'test-template',
        indexPatterns: ['logs-*'],
        _kbnMeta: {} as unknown,
      })
    ).toThrow();
  });

  it('SHOULD accept optional version and order fields', () => {
    const value = templateSchema.validate({
      name: 'test-template',
      indexPatterns: ['logs-*'],
      version: 1,
      order: 10,
      _kbnMeta: { type: 'default' },
    });
    expect(value).toBeTruthy();
    expect(value.version).toBe(1);
    expect(value.order).toBe(10);
  });

  it('SHOULD accept optional priority field', () => {
    const value = templateSchema.validate({
      name: 'test-template',
      indexPatterns: ['logs-*'],
      priority: 100,
      _kbnMeta: { type: 'default' },
    });
    expect(value).toBeTruthy();
    expect(value.priority).toBe(100);
  });

  it('SHOULD accept optional indexMode field', () => {
    const value = templateSchema.validate({
      name: 'test-template',
      indexPatterns: ['logs-*'],
      indexMode: 'logsdb',
      _kbnMeta: { type: 'default' },
    });
    expect(value).toBeTruthy();
    expect(value.indexMode).toBe('logsdb');
  });

  it('SHOULD accept optional allowAutoCreate field', () => {
    const value = templateSchema.validate({
      name: 'test-template',
      indexPatterns: ['logs-*'],
      allowAutoCreate: 'true',
      _kbnMeta: { type: 'default' },
    });
    expect(value).toBeTruthy();
  });

  it('SHOULD accept template with settings', () => {
    const value = templateSchema.validate({
      name: 'test-template',
      indexPatterns: ['logs-*'],
      template: {
        settings: {
          number_of_shards: 1,
          number_of_replicas: 0,
        },
      },
      _kbnMeta: { type: 'default' },
    });
    expect(value).toBeTruthy();
    expect(value.template?.settings).toEqual({
      number_of_shards: 1,
      number_of_replicas: 0,
    });
  });

  it('SHOULD accept template with aliases', () => {
    const value = templateSchema.validate({
      name: 'test-template',
      indexPatterns: ['logs-*'],
      template: {
        aliases: {
          'my-alias': {},
        },
      },
      _kbnMeta: { type: 'default' },
    });
    expect(value).toBeTruthy();
    expect(value.template?.aliases).toEqual({ 'my-alias': {} });
  });

  it('SHOULD accept template with mappings', () => {
    const value = templateSchema.validate({
      name: 'test-template',
      indexPatterns: ['logs-*'],
      template: {
        mappings: {
          properties: {
            timestamp: { type: 'date' },
            message: { type: 'text' },
          },
        },
      },
      _kbnMeta: { type: 'default' },
    });
    expect(value).toBeTruthy();
    expect(value.template?.mappings).toEqual({
      properties: {
        timestamp: { type: 'date' },
        message: { type: 'text' },
      },
    });
  });

  it('SHOULD accept template with lifecycle', () => {
    const value = templateSchema.validate({
      name: 'test-template',
      indexPatterns: ['logs-*'],
      template: {
        lifecycle: {
          enabled: true,
          data_retention: '30d',
        },
      },
      _kbnMeta: { type: 'default' },
    });
    expect(value).toBeTruthy();
    expect(value.template?.lifecycle).toEqual({
      enabled: true,
      data_retention: '30d',
    });
  });

  it('SHOULD reject invalid lifecycle enabled type', () => {
    expect(() =>
      templateSchema.validate({
        name: 'test-template',
        indexPatterns: ['logs-*'],
        template: {
          lifecycle: {
            enabled: 'yes',
          },
        },
        _kbnMeta: { type: 'default' },
      })
    ).toThrow();
  });

  it('SHOULD accept composedOf array', () => {
    const value = templateSchema.validate({
      name: 'test-template',
      indexPatterns: ['logs-*'],
      composedOf: ['component-template-1', 'component-template-2'],
      _kbnMeta: { type: 'default' },
    });
    expect(value).toBeTruthy();
    expect(value.composedOf).toEqual(['component-template-1', 'component-template-2']);
  });

  it('SHOULD accept ignoreMissingComponentTemplates array', () => {
    const value = templateSchema.validate({
      name: 'test-template',
      indexPatterns: ['logs-*'],
      ignoreMissingComponentTemplates: ['optional-component'],
      _kbnMeta: { type: 'default' },
    });
    expect(value).toBeTruthy();
    expect(value.ignoreMissingComponentTemplates).toEqual(['optional-component']);
  });

  it('SHOULD accept dataStream configuration', () => {
    const value = templateSchema.validate({
      name: 'test-template',
      indexPatterns: ['logs-*'],
      dataStream: {
        hidden: true,
      },
      _kbnMeta: { type: 'default' },
    });
    expect(value).toBeTruthy();
    expect(value.dataStream).toEqual({ hidden: true });
  });

  it('SHOULD accept dataStream with unknown fields', () => {
    const value = templateSchema.validate({
      name: 'test-template',
      indexPatterns: ['logs-*'],
      dataStream: {
        hidden: false,
        some_future_option: true,
      },
      _kbnMeta: { type: 'default' },
    });
    expect(value).toBeTruthy();
    expect(value.dataStream).toEqual({ hidden: false, some_future_option: true });
  });

  it('SHOULD accept arbitrary _meta object', () => {
    const value = templateSchema.validate({
      name: 'test-template',
      indexPatterns: ['logs-*'],
      _meta: { managed: true, description: 'Test template', custom: { nested: 1 } },
      _kbnMeta: { type: 'default' },
    });
    expect(value).toBeTruthy();
    expect(value._meta).toEqual({
      managed: true,
      description: 'Test template',
      custom: { nested: 1 },
    });
  });

  it('SHOULD accept ilmPolicy configuration', () => {
    const value = templateSchema.validate({
      name: 'test-template',
      indexPatterns: ['logs-*'],
      ilmPolicy: {
        name: 'my-ilm-policy',
        rollover_alias: 'my-alias',
      },
      _kbnMeta: { type: 'default' },
    });
    expect(value).toBeTruthy();
    expect(value.ilmPolicy).toEqual({
      name: 'my-ilm-policy',
      rollover_alias: 'my-alias',
    });
  });

  it('SHOULD accept _kbnMeta with hasDatastream and isLegacy flags', () => {
    const value = templateSchema.validate({
      name: 'test-template',
      indexPatterns: ['logs-*'],
      _kbnMeta: {
        type: 'default',
        hasDatastream: true,
        isLegacy: false,
      },
    });
    expect(value).toBeTruthy();
    expect(value._kbnMeta).toEqual({
      type: 'default',
      hasDatastream: true,
      isLegacy: false,
    });
  });

  it('SHOULD accept deprecated flag', () => {
    const value = templateSchema.validate({
      name: 'test-template',
      indexPatterns: ['logs-*'],
      deprecated: true,
      _kbnMeta: { type: 'default' },
    });
    expect(value).toBeTruthy();
    expect(value.deprecated).toBe(true);
  });

  it('SHOULD accept complete template with all fields', () => {
    const value = templateSchema.validate({
      name: 'complete-template',
      indexPatterns: ['logs-*', 'metrics-*'],
      version: 2,
      order: 5,
      priority: 200,
      indexMode: 'logsdb',
      allowAutoCreate: 'true',
      template: {
        settings: { number_of_shards: 2 },
        aliases: { 'all-logs': {} },
        mappings: { properties: { '@timestamp': { type: 'date' } } },
        lifecycle: { enabled: true, data_retention: '90d' },
      },
      composedOf: ['base-component'],
      ignoreMissingComponentTemplates: ['optional-component'],
      dataStream: { hidden: false },
      _meta: { description: 'Complete template' },
      ilmPolicy: { name: 'default-policy' },
      _kbnMeta: { type: 'default', hasDatastream: true, isLegacy: false },
      deprecated: false,
    });
    expect(value).toBeTruthy();
    expect(value.name).toBe('complete-template');
    expect(value.indexPatterns).toEqual(['logs-*', 'metrics-*']);
  });
});
