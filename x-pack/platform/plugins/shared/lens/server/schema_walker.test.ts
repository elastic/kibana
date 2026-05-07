/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildFieldDescriptors } from './schema_walker';
import type { JoiDescription } from './schema_walker';
import type { UISchemaEntry } from './ui_schemas';

describe('buildFieldDescriptors', () => {
  it('returns only fields listed in the UI schema (allowlist)', () => {
    const description = {
      type: 'object',
      keys: {
        styling: {
          type: 'object',
          keys: {
            density: {
              type: 'object',
              keys: {
                mode: {
                  type: 'string',
                  allow: ['compact', 'default', 'expanded'],
                  flags: { default: 'default', description: 'Display density mode.' },
                },
              },
            },
            paging: {
              type: 'number',
              flags: { description: 'Rows per page.' },
            },
            row_numbers: {
              type: 'object',
              keys: {
                visible: {
                  type: 'boolean',
                  flags: { description: 'When true, displays row numbers.' },
                },
              },
            },
          },
        },
        type: { type: 'string', allow: ['data_table'] },
        title: { type: 'string' },
      },
    };

    const uiSchema: UISchemaEntry[] = [
      { path: 'styling.density.mode', label: 'Density', widget: 'buttonGroup' },
      { path: 'styling.row_numbers.visible', label: 'Show row numbers' },
    ];

    const fields = buildFieldDescriptors(description as unknown as JoiDescription, uiSchema);

    expect(fields).toHaveLength(2);
    expect(fields[0]).toMatchObject({
      path: 'styling.density.mode',
      type: 'select',
      label: 'Density',
      widget: 'buttonGroup',
      options: [
        { value: 'compact', label: 'compact' },
        { value: 'default', label: 'default' },
        { value: 'expanded', label: 'expanded' },
      ],
    });
    expect(fields[1]).toMatchObject({
      path: 'styling.row_numbers.visible',
      type: 'toggle',
      label: 'Show row numbers',
    });
    // type and title should NOT be in output
    expect(fields.find((f) => f.path === 'type')).toBeUndefined();
    expect(fields.find((f) => f.path === 'title')).toBeUndefined();
  });

  it('applies widget, props, and tooltip from UI schema', () => {
    const description = {
      type: 'object',
      keys: {
        styling: {
          type: 'object',
          keys: {
            paging: { type: 'number', flags: { description: 'Rows per page.' } },
          },
        },
      },
    };

    const uiSchema: UISchemaEntry[] = [
      {
        path: 'styling.paging',
        label: 'Paginate table',
        widget: 'paginationToggle',
        tooltip: 'Pagination is hidden if there are less than 10 items',
        props: { options: [10, 20, 50] },
      },
    ];

    const fields = buildFieldDescriptors(description as unknown as JoiDescription, uiSchema);

    expect(fields).toHaveLength(1);
    expect(fields[0]).toMatchObject({
      path: 'styling.paging',
      label: 'Paginate table',
      widget: 'paginationToggle',
      tooltip: 'Pagination is hidden if there are less than 10 items',
      props: { options: [10, 20, 50] },
    });
  });

  it('skips paths not found in the schema description', () => {
    const description = {
      type: 'object',
      keys: { foo: { type: 'string' } },
    };

    const uiSchema: UISchemaEntry[] = [
      { path: 'nonexistent.path', label: 'Missing' },
      { path: 'foo', label: 'Foo' },
    ];

    const fields = buildFieldDescriptors(description as unknown as JoiDescription, uiSchema);
    expect(fields).toHaveLength(1);
    expect(fields[0].path).toBe('foo');
  });

  it('unwraps maybe (alternatives with any) wrappers', () => {
    // schema.maybe(schema.object({ visible: schema.boolean() })) produces:
    const description = {
      type: 'object',
      keys: {
        styling: {
          type: 'alternatives',
          matches: [
            {
              schema: {
                type: 'object',
                keys: {
                  visible: { type: 'boolean', flags: { description: 'Show it' } },
                },
              },
            },
            { schema: { type: 'any', allow: [undefined] } },
          ],
        },
      },
    };

    const uiSchema: UISchemaEntry[] = [{ path: 'styling.visible', label: 'Visible' }];

    const fields = buildFieldDescriptors(description as unknown as JoiDescription, uiSchema);
    expect(fields).toHaveLength(1);
    expect(fields[0]).toMatchObject({ path: 'styling.visible', type: 'toggle', label: 'Visible' });
  });
});
