/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { buildSchemaSectionIndex } from './schema_section_index';

describe('buildSchemaSectionIndex', () => {
  // No ES|QL chart schema intersects objects today, but the non-ES|QL variants do.
  it('lists the fields of every intersected part', () => {
    const column = z.object({ column: z.string(), label: z.string().optional() });
    const metric = column.and(
      z.object({ apply_color_to: z.enum(['value', 'background']).optional() })
    );

    expect(buildSchemaSectionIndex(z.object({ metric, metrics: z.array(metric) }))).toBe(
      [
        '- metric: column*, label, apply_color_to: value|background',
        '- metrics: column*, label, apply_color_to: value|background',
      ].join('\n')
    );
  });

  it('lists a field that several intersected parts define once, required when any part requires it', () => {
    const section = z.object({ label: z.string().optional() }).and(z.object({ label: z.string() }));

    expect(buildSchemaSectionIndex(z.object({ section }))).toBe('- section: label*');
  });
});
