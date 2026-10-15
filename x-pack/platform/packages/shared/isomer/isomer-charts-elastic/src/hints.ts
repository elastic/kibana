/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Presentation a host carries from its source (Lens) to this engine, keyed by node id. It never changes
// what a chart says: data, labels, and formats stay in the composition.

import { z } from '@elastic/isomer-sdk';

export const ANNOTATION_ICONS = ['triangle', 'alert', 'asterisk', 'bell'] as const;

const hex = z.string().regex(/^#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?$/);

const axisHint = z
  .object({
    title: z.boolean().optional(),
    ticks: z.boolean().optional(),
    gridlines: z.boolean().optional(),
    /** Tick label rotation in degrees. */
    labelRotation: z.number().min(-90).max(90).optional(),
  })
  .strict();

export const chartHintSchema = z
  .object({
    legend: z
      .object({
        show: z.boolean().optional(),
        position: z.enum(['top', 'bottom', 'left', 'right']).optional(),
      })
      .strict()
      .optional(),
    /** Literal colors per series, slice, category, or annotation key, and per band as `band:<index>`. */
    colors: z.record(z.string(), hex).optional(),
    valueLabels: z.boolean().optional(),
    curve: z.enum(['linear', 'monotone', 'step']).optional(),
    fillOpacity: z.number().min(0).max(1).optional(),
    axes: z.object({ x: axisHint, y: axisHint, y2: axisHint }).partial().strict().optional(),
    /** A partition drawn without a hole. */
    pie: z.boolean().optional(),
    /** What a partition's slices print: their value, their share, or nothing. */
    values: z.enum(['value', 'percent', 'hidden']).optional(),
    /** The marker an annotation draws with, by annotation key. Defaults to a triangle. */
    icons: z.record(z.string(), z.enum(ANNOTATION_ICONS)).optional(),
    /** A gauge drawn as Lens's metric, its progress bar in this direction. */
    progress: z.enum(['horizontal', 'vertical']).optional(),
    /** Decimal places a percent share prints with. Defaults to Lens's 2. */
    percentDecimals: z.number().int().min(0).max(20).optional(),
  })
  .strict();

export type ChartHint = z.infer<typeof chartHintSchema>;

export const chartHintsSchema = z.record(z.string(), chartHintSchema);

export type ChartHints = z.infer<typeof chartHintsSchema>;
