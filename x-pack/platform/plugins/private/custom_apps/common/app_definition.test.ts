/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { customAppDefinitionSchema, emptyAppDefinition, getPanelIds } from './app_definition';
import type { CustomAppLayout } from './app_definition';

describe('getPanelIds', () => {
  it('returns top-level panels', () => {
    const layout: CustomAppLayout = {
      a: { type: 'panel', id: 'a', row: 0, column: 0, width: 24, height: 10 },
      b: { type: 'panel', id: 'b', row: 0, column: 24, width: 24, height: 10 },
    };
    expect(getPanelIds(layout).sort()).toEqual(['a', 'b']);
  });

  it('also walks panels nested inside collapsible sections', () => {
    const layout: CustomAppLayout = {
      top: { type: 'panel', id: 'top', row: 0, column: 0, width: 48, height: 6 },
      section1: {
        type: 'section',
        id: 'section1',
        row: 6,
        title: 'More',
        isCollapsed: false,
        panels: {
          nested: { id: 'nested', row: 0, column: 0, width: 24, height: 8 },
        },
      },
    };
    expect(getPanelIds(layout).sort()).toEqual(['nested', 'top']);
  });
});

describe('customAppDefinitionSchema', () => {
  const valid = {
    ...emptyAppDefinition('Test app'),
    layout: {
      p1: { type: 'panel', id: 'p1', row: 0, column: 0, width: 24, height: 10 },
    },
    panels: { p1: { title: 'Panel' } },
    surfaces: {
      p1: [{ version: 'v1.0', createSurface: { surfaceId: 'p1', components: [] } }],
    },
  };

  it('accepts a well-formed definition', () => {
    expect(customAppDefinitionSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects an unknown version', () => {
    expect(customAppDefinitionSchema.safeParse({ ...valid, version: 2 }).success).toBe(false);
  });

  it('rejects a surface entry that is not an A2UI message', () => {
    const result = customAppDefinitionSchema.safeParse({
      ...valid,
      surfaces: { p1: [{ notAMessage: true }] },
    });
    expect(result.success).toBe(false);
  });

  it('rejects a panel with a negative position', () => {
    const result = customAppDefinitionSchema.safeParse({
      ...valid,
      layout: { p1: { type: 'panel', id: 'p1', row: -1, column: 0, width: 24, height: 10 } },
    });
    expect(result.success).toBe(false);
  });

  it('accepts each of the four A2UI message types', () => {
    const result = customAppDefinitionSchema.safeParse({
      ...valid,
      surfaces: {
        p1: [
          { createSurface: { surfaceId: 'p1' } },
          { updateComponents: { surfaceId: 'p1', components: [] } },
          { updateDataModel: { surfaceId: 'p1', value: {} } },
          { deleteSurface: { surfaceId: 'p1' } },
        ],
      },
    });
    expect(result.success).toBe(true);
  });
});
