/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';
import { z } from '@kbn/zod/v4';
import { load } from 'cheerio';
import type { BaseParams } from '@kbn/reporting-common/types';

/**
 * Strip all HTML tags from a string while preserving text content.
 */

/** Elements whose content is stripped together with the tag, as a CSS selector. */
const FULLY_REMOVED_ELEMENTS = [
  'script',
  'style',
  'template',
  'svg',
  'math',
  'annotation-xml',
  'audio',
  'colgroup',
  'desc',
  'foreignobject',
  'head',
  'iframe',
  'mi',
  'mn',
  'mo',
  'ms',
  'mtext',
  'noembed',
  'noframes',
  'noscript',
  'plaintext',
  'thead',
  'title',
  'video',
  'xmp',
].join(',');

const sanitizeString = (input: string): string => {
  if (typeof input !== 'string') {
    return '';
  }

  const $ = load(input);
  $(FULLY_REMOVED_ELEMENTS).remove();
  return $.root().text();
};

export function validateTimezone(timezone: string) {
  if (moment.tz.zone(timezone) != null) {
    return;
  }

  return 'string is not a valid timezone: ' + timezone;
}

const timezoneSchema = z.string().refine((val) => validateTimezone(val) === undefined, {
  message: 'Invalid timezone',
});

const dimensionsSchema = z
  .object({
    // 16000px height is the maximum screenshot Chrome can make
    height: z.number().positive().max(16000),
    width: z.number().positive().max(14400),
  })
  .strict();

export const idSchema = z.enum(['preserve_layout', 'print', 'canvas', 'png']); // "png" is used in some tests, could be a legacy value

const layoutSchema = z
  .object({
    id: idSchema.optional(),
    dimensions: dimensionsSchema.optional(),
    zoom: z.number().positive().max(1000).optional(),
    selectors: z
      .object({
        screenshot: z.string().max(1024).optional(),
        renderComplete: z.string().max(1024).optional(),
        renderError: z.string().max(1024).optional(),
        renderErrorAttribute: z.string().max(1024).optional(),
        itemsCountAttribute: z.string().max(1024).optional(),
        timefilterDurationAttribute: z.string().max(1024).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

const objectTypeSchema = z
  .string()
  .max(256)
  .transform((objectType) => sanitizeString(objectType));

const titleSchema = z
  .string()
  .max(2048)
  .transform((title) => sanitizeString(title));
const versionSchema = z
  .string()
  .max(32)
  .transform((version) => sanitizeString(version));

const forceNowSchema = z
  .string()
  .max(32)
  .transform((forceNow) => sanitizeString(forceNow));

export const pagingStrategySchema = z.enum(['pit', 'scroll']);

const locatorObjectSchema = z.object({
  id: z.string().max(1024).optional(),
  version: z.string().max(32).optional(),
  params: z.record(z.any(), z.any()).optional(),
});

const locatorParamsSchema = z.array(locatorObjectSchema).max(100).or(locatorObjectSchema);

const relativeUrlSchema = z.string().max(4096);
const relativeUrlsSchema = z.array(relativeUrlSchema).max(100);

const jobParamsSchema = z
  .object({
    browserTimezone: timezoneSchema.optional(),
    objectType: objectTypeSchema.optional(),
    title: titleSchema.optional(),
    version: versionSchema.optional(),
    layout: layoutSchema.optional(),
    forceNow: forceNowSchema.optional(),
    pagingStrategy: pagingStrategySchema.optional(), // for CSV reports
    locatorParams: locatorParamsSchema.nullable().optional(), // this is for CSV v2 compatibility
    searchSource: z.record(z.string(), z.any()).optional(), // this is for CSV v1 compatibility
    columns: z.array(z.string()).optional(), // this is for CSV v1 compatibility
    relativeUrls: relativeUrlsSchema.optional(), // used in tests could be legacy
    relativeUrl: relativeUrlSchema.optional(), // used in tests could be legacy
    isEsqlMode: z.boolean().optional(), // for CSV reports
  })
  .strict();

export function validateJobParams(jobParams: BaseParams) {
  return jobParamsSchema.parse(jobParams);
}
