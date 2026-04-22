/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { StepCategory } from '@kbn/workflows';

export const DiscoverFeaturesStepTypeId = 'alerting.discoverFeatures';

const RuleEntrySchema = z.object({
  id: z.string(),
  rule: z.record(z.string(), z.unknown()),
});

export const InputSchema = z.object({
  rules: z.array(RuleEntrySchema),
  max_data_views: z.number().default(5),
});

const FeatureSummarySchema = z.object({
  id: z.string(),
  type: z.string(),
  subtype: z.string().optional(),
  title: z.string().optional(),
  description: z.string(),
  properties: z.record(z.string(), z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
  stream_name: z.string().optional(),
});

const DataViewReportSchema = z.object({
  name: z.string(),
  pattern: z.string(),
  source: z.enum(['existing_kis', 'inline_extraction', 'skipped']),
  stream_name: z.string().optional(),
  feature_count: z.number(),
});

export const OutputSchema = z.object({
  features: z.array(FeatureSummarySchema),
  data_views_processed: z.array(DataViewReportSchema),
});

export type DiscoverFeaturesInput = z.infer<typeof InputSchema>;
export type DiscoverFeaturesOutput = z.infer<typeof OutputSchema>;

export const discoverFeaturesCommonDefinition: CommonStepDefinition<
  typeof InputSchema,
  typeof OutputSchema
> = {
  id: DiscoverFeaturesStepTypeId,
  label: 'Discover Features',
  description:
    'Discovers real services, technologies, and infrastructure from data views using Knowledge Indicators and inline feature extraction',
  category: StepCategory.Data,
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
};
