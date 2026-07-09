/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { MAX_VEGA_SPEC_LENGTH } from '@kbn/agent-builder-visualizations-common';

export { MAX_VEGA_SPEC_LENGTH };

/**
 * Runtime validation for visualization attachment data. The matching type
 * contract (`VisualizationAttachmentData`) lives in
 * `@kbn/agent-builder-visualizations-common` because it is shared across the
 * browser and server; this schema is server-only (attachment validation).
 */
export const visualizationAttachmentDataSchema = z
  .object({
    // Optional for backwards compatibility: attachments created before the Vega
    // renderer existed have no `renderer` field and are implicitly Lens.
    renderer: z.enum(['lens', 'vega']).optional(),
    query: z.string().max(2048),
    visualization: z.record(z.string().max(1024), z.unknown()),
    chart_type: z.string().max(256).optional(),
    esql: z.string().max(4096),
    time_range: z
      .object({
        from: z.string().max(256),
        to: z.string().max(256),
      })
      .optional(),
  })
  .check((ctx) => {
    if (ctx.value.renderer === 'vega') {
      const spec = (ctx.value.visualization as { spec?: unknown }).spec;
      if (typeof spec !== 'string' || spec.length === 0) {
        ctx.issues.push({
          code: 'custom',
          message: 'Vega visualizations must provide visualization.spec',
          input: ctx.value,
        });
      } else if (spec.length > MAX_VEGA_SPEC_LENGTH) {
        ctx.issues.push({
          code: 'custom',
          message: `Vega visualization.spec must be at most ${MAX_VEGA_SPEC_LENGTH} characters`,
          input: ctx.value,
        });
      }
    }
  });
