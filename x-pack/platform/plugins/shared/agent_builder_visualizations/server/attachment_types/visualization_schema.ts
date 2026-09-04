/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { MAX_VEGA_SPEC_LENGTH } from '@kbn/agent-builder-visualizations-common';
import {
  CUSTOM_CONTENT_MAX_TEMPLATE_SCHEMA_LENGTH,
  CUSTOM_CONTENT_MAX_TEMPLATE_BYTES,
  CUSTOM_CONTENT_MIN_HEIGHT,
  CUSTOM_CONTENT_MAX_HEIGHT,
  CUSTOM_CONTENT_SCRIPT_PATTERN,
} from '@kbn/custom-content-common';

export { MAX_VEGA_SPEC_LENGTH };

const timeRangeSchema = z.object({
  from: z.string().max(256),
  to: z.string().max(256),
});

/**
 * A Lens or Vega payload. `renderer` is optional for backwards compatibility:
 * attachments created before the discriminator existed are implicitly Lens.
 *
 * `esql` stays required here — a chart is always query-backed, and only custom
 * content may be static.
 */
const chartVisualizationSchema = z
  .object({
    renderer: z.enum(['lens', 'vega']).optional(),
    query: z.string().max(2048),
    visualization: z.record(z.string().max(1024), z.unknown()),
    chart_type: z.string().max(256).optional(),
    esql: z.string().max(4096),
    time_range: timeRangeSchema.optional(),
  })
  .check((ctx) => {
    if (ctx.value.renderer !== 'vega') {
      return;
    }
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
  });

/**
 * A custom content payload: an LLM-authored HTML/Liquid template.
 *
 * The iframe sandbox and DOMPurify are what make the template safe at render
 * time; rejecting scripts and oversized markup here keeps the stored payload
 * clean too, matching what the dashboard generation path enforces.
 */
const customContentVisualizationSchema = z.object({
  renderer: z.literal('custom_content'),
  query: z.string().max(2048),
  visualization: z.object({
    template: z
      .string()
      .min(1)
      .max(CUSTOM_CONTENT_MAX_TEMPLATE_SCHEMA_LENGTH)
      .refine(
        (template) => Buffer.byteLength(template, 'utf8') <= CUSTOM_CONTENT_MAX_TEMPLATE_BYTES,
        {
          message: `template must be at most ${CUSTOM_CONTENT_MAX_TEMPLATE_BYTES} bytes`,
        }
      )
      .refine((template) => !CUSTOM_CONTENT_SCRIPT_PATTERN.test(template), {
        message: 'template must not contain a <script> tag',
      }),
    title: z.string().max(256).optional(),
    height: z
      .number()
      .int()
      .min(CUSTOM_CONTENT_MIN_HEIGHT)
      .max(CUSTOM_CONTENT_MAX_HEIGHT)
      .optional(),
  }),
  // A custom content panel with no query renders static content.
  esql: z.string().max(4096).optional(),
  time_range: timeRangeSchema.optional(),
});

/**
 * Runtime validation for visualization attachment data. The matching type
 * contract (`VisualizationAttachmentData`) lives in
 * `@kbn/agent-builder-visualizations-common` because it is shared across the
 * browser and server; this schema is server-only (attachment validation).
 *
 * A union rather than one object with conditional refinements, so the per-renderer
 * guarantees the type expresses — a template for custom content, an `esql` for the
 * chart renderers — are the ones the parser actually enforces.
 */
export const visualizationAttachmentDataSchema = z.union([
  customContentVisualizationSchema,
  chartVisualizationSchema,
]);
