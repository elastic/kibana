/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { compileLayout } from '../layout';
import { defineOperation } from './types';

const widthSchema = z.union([
  z.enum(['full', 'half', 'third', 'quarter', 'sixth', 'eighth']),
  z.number().int().min(1).max(48),
]);

const panelRefSchema = z.union([
  z.string().max(256),
  z.object({
    ref: z.string().max(256),
    width: widthSchema.optional(),
  }),
]);

const sectionLayoutSchema = z.object({
  ref: z.string().max(256).optional(),
  key: z.string().max(256).optional(),
  title: z.string().max(256).optional(),
  collapsed: z.boolean().optional(),
  rows: z.array(z.array(panelRefSchema)),
});

export const setLayoutOperation = defineOperation({
  schema: z
    .object({
      operation: z.literal('set_layout'),
      auto: z.literal(true).optional(),
      rows: z.array(z.array(panelRefSchema)).optional(),
      sections: z.array(sectionLayoutSchema).optional(),
    })
    .check((ctx) => {
      const hasAuto = ctx.value.auto === true;
      const hasStructure = ctx.value.rows !== undefined || ctx.value.sections !== undefined;
      if (hasAuto === hasStructure) {
        ctx.issues.push({
          code: 'custom',
          message: 'set_layout requires auto: true or rows/sections, not both',
          input: ctx.value,
        });
      }
    }),
  handler: ({ dashboardData, operation, context }) => {
    const result = compileLayout({
      dashboard: dashboardData,
      spec: operation.auto === true
        ? { auto: true }
        : { rows: operation.rows, sections: operation.sections },
      panelKeys: context.panelKeys,
    });

    context.layoutWarnings.push(...result.warnings);
    context.layoutRows = result.rows;
    context.failures.push(...result.failures);
    for (const [key, id] of result.mintedKeys) {
      context.panelKeys.set(key, id);
    }
    return result.dashboard;
  },
});
