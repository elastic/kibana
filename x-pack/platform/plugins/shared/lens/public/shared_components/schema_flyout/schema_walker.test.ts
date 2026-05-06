/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0"; you may not use this file except in compliance with the "Elastic License
 * 2.0".
 */

import { schema } from '@kbn/config-schema';
import { walkSchema } from './schema_walker';

describe('walkSchema', () => {
  const testSchema = schema.object({
    visible: schema.boolean({
      defaultValue: true,
      meta: { description: 'Show the widget' },
    }),
    position: schema.oneOf(
      [
        schema.literal('top'),
        schema.literal('bottom'),
        schema.literal('left'),
        schema.literal('right'),
      ],
      { meta: { description: 'Position' } }
    ),
    size: schema.number({
      min: 0,
      max: 100,
      meta: { description: 'Size in pixels' },
    }),
    nested: schema.object({
      enabled: schema.boolean({ meta: { description: 'Enable nested' } }),
    }),
  });

  it('should detect boolean as toggle', () => {
    const fields = walkSchema(testSchema);
    const visible = fields.find((f) => f.path === 'visible');
    expect(visible).toBeDefined();
    expect(visible!.type).toBe('toggle');
    expect(visible!.defaultValue).toBe(true);
    expect(visible!.description).toBe('Show the widget');
  });

  it('should detect oneOf literals as select', () => {
    const fields = walkSchema(testSchema);
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
    const fields = walkSchema(testSchema);
    const size = fields.find((f) => f.path === 'size');
    expect(size).toBeDefined();
    expect(size!.type).toBe('number');
    expect(size!.min).toBe(0);
    expect(size!.max).toBe(100);
  });

  it('should detect nested object as section with children', () => {
    const fields = walkSchema(testSchema);
    const nested = fields.find((f) => f.path === 'nested');
    expect(nested).toBeDefined();
    expect(nested!.type).toBe('section');
    expect(nested!.children).toHaveLength(1);
    expect(nested!.children![0].path).toBe('nested.enabled');
    expect(nested!.children![0].type).toBe('toggle');
  });

  it('should produce correct paths', () => {
    const fields = walkSchema(testSchema);
    const paths = fields.map((f) => f.path);
    expect(paths).toEqual(['visible', 'position', 'size', 'nested']);
  });

  it('should support pathPrefix option', () => {
    const fields = walkSchema(testSchema, { pathPrefix: 'config' });
    expect(fields[0].path).toBe('config.visible');
  });

  it('should support excludePaths option', () => {
    const fields = walkSchema(testSchema, { excludePaths: ['visible', 'nested'] });
    const paths = fields.map((f) => f.path);
    expect(paths).not.toContain('visible');
    expect(paths).not.toContain('nested');
  });

  it('should detect string as text', () => {
    const s = schema.object({
      name: schema.string({ meta: { description: 'Name' } }),
    });
    const fields = walkSchema(s);
    expect(fields[0].type).toBe('text');
  });

  it('should detect maybe() as not required', () => {
    const s = schema.object({
      optionalField: schema.maybe(schema.string()),
    });
    const fields = walkSchema(s);
    expect(fields[0].required).toBe(false);
  });

  it('should handle meta title as label', () => {
    const s = schema.object({
      myField: schema.string({ meta: { title: 'My Custom Label' } }),
    });
    const fields = walkSchema(s);
    expect(fields[0].label).toBe('My Custom Label');
  });

  it('should fall back to key name as label', () => {
    const s = schema.object({
      myField: schema.string(),
    });
    const fields = walkSchema(s);
    expect(fields[0].label).toBe('myField');
  });
});
