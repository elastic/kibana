/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

const layoutSchema = z.object({
  orientation: z.enum(['landscape', 'portrait']).optional(),
  hasHeader: z.boolean(),
  hasFooter: z.boolean(),
  useReportingBranding: z.boolean(),
  pageSize: z.string().or(
    z.object({
      width: z.number().positive().max(14400),
      height: z.enum(['auto']).or(z.number().positive().max(14400)),
    })
  ),
});

const titleSchema = z.string().min(1).max(1024);
const logoSchema = z.string().url().max(1024).optional().nullable();

const contentTextSchema = z.object({
  text: z.string(),
  style: z.enum(['heading', 'subheading']),
  font: z.enum(['Roboto', 'noto-cjk']),
  noWrap: z.boolean().optional(),
});

const contentImageSchema = z.object({
  image: z.instanceof(ArrayBuffer).or(z.object({}).strict()),
  alignment: z.literal('center'),
  width: z.number().positive().max(14400),
  height: z.number().positive().max(14400),
});

const contentBreakSchema = z.array(
  z.object({
    text: z.string().max(0),
    pageBreak: z.enum(['before', 'after']),
  })
);

const contentTableSchema = z.object({
  table: z.object({
    body: z.array(z.array(contentImageSchema)),
  }),
  layout: z.literal('noBorder'),
});

const contentSchema = z.array(z.union([contentTextSchema, contentTableSchema]));

export const generateReportRequestDataSchema = z.object({
  layout: layoutSchema,
  title: titleSchema,
  logo: logoSchema,
  content: z.array(z.union([contentSchema, contentBreakSchema])),
});

export const generateReportRequestSchema = z.object({
  data: generateReportRequestDataSchema,
});
