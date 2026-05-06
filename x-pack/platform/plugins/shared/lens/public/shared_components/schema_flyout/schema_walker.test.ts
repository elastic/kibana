/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { walkSchemaDescription } from './schema_walker';

describe('walkSchemaDescription', () => {
  const testDescription: Record<string, unknown> = {
    type: 'object',
    keys: {
      visible: {
        type: 'boolean',
        flags: { default: true, description: 'Show the widget' },
      },
      position: {
        type: 'alternatives',
        matches: [
          { schema: { type: 'any', allow: ['top'] } },
          { schema: { type: 'any', allow: ['bottom'] } },
          { schema: { type: 'any', allow: ['left'] } },
          { schema: { type: 'any', allow: ['right'] } },
        ],
        metas: [{ description: 'Position' }],
      },
      size: {
        type: 'number',
        rules: [
          { name: 'min', args: { limit: 0 } },
          { name: 'max', args: { limit: 100 } },
        ],
        metas: [{ description: 'Size in pixels' }],
      },
      nested: {
        type: 'object',
        keys: {
          enabled: {
            type: 'boolean',
            metas: [{ description: 'Enable nested' }],
          },
        },
      },
    },
  };

  it('should detect boolean as toggle', () => {
    const fields = walkSchemaDescription(testDescription);
    const visible = fields.find((f) => f.path === 'visible');
    expect(visible).toBeDefined();
    expect(visible!.type).toBe('toggle');
    expect(visible!.defaultValue).toBe(true);
    expect(visible!.description).toBe('Show the widget');
  });

  it('should detect alternatives with literal allows as select', () => {
    const fields = walkSchemaDescription(testDescription);
    const position = fields.find((f) => f.path === 'position');
    expect(position).toBeDefined();
    expect(position!.type).toBe('select');
    expect(position!.options).toEqual([
      { value: 'top', label: 'top' },
      { value: 'bottom', label: 'bottom' },
      { value: 'left', label: 'left' },
      { value: 'right', label: 'right' },
    ]);
  });

  it('should detect number with min/max', () => {
    const fields = walkSchemaDescription(testDescription);
    const size = fields.find((f) => f.path === 'size');
    expect(size).toBeDefined();
    expect(size!.type).toBe('number');
    expect(size!.min).toBe(0);
    expect(size!.max).toBe(100);
  });

  it('should detect nested object as section with children', () => {
    const fields = walkSchemaDescription(testDescription);
    const nested = fields.find((f) => f.path === 'nested');
    expect(nested).toBeDefined();
    expect(nested!.type).toBe('section');
    expect(nested!.children).toHaveLength(1);
    expect(nested!.children![0].path).toBe('nested.enabled');
    expect(nested!.children![0].type).toBe('toggle');
  });

  it('should produce correct paths', () => {
    const fields = walkSchemaDescription(testDescription);
    const paths = fields.map((f) => f.path);
    expect(paths).toEqual(['visible', 'position', 'size', 'nested']);
  });

  it('should support pathPrefix option', () => {
    const fields = walkSchemaDescription(testDescription, { pathPrefix: 'config' });
    expect(fields[0].path).toBe('config.visible');
  });

  it('should support excludePaths option', () => {
    const fields = walkSchemaDescription(testDescription, {
      excludePaths: ['visible', 'nested'],
    });
    const paths = fields.map((f) => f.path);
    expect(paths).not.toContain('visible');
    expect(paths).not.toContain('nested');
  });

  it('should detect string as text', () => {
    const desc: Record<string, unknown> = {
      type: 'object',
      keys: {
        name: { type: 'string', metas: [{ description: 'Name' }] },
      },
    };
    const fields = walkSchemaDescription(desc);
    expect(fields[0].type).toBe('text');
  });

  it('should handle meta title as label', () => {
    const desc: Record<string, unknown> = {
      type: 'object',
      keys: {
        myField: { type: 'string', metas: [{ title: 'My Custom Label' }] },
      },
    };
    const fields = walkSchemaDescription(desc);
    expect(fields[0].label).toBe('My Custom Label');
  });

  it('should fall back to key name as label', () => {
    const desc: Record<string, unknown> = {
      type: 'object',
      keys: {
        myField: { type: 'string' },
      },
    };
    const fields = walkSchemaDescription(desc);
    expect(fields[0].label).toBe('myField');
  });

  it('should return empty array for description without keys', () => {
    const desc: Record<string, unknown> = { type: 'string' };
    const fields = walkSchemaDescription(desc);
    expect(fields).toEqual([]);
  });
});
