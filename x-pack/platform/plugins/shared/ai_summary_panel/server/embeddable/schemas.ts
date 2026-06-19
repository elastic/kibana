/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { serializedTitlesSchema } from '@kbn/presentation-publishing-schemas';

export const aiSummaryPanelStateSchema = schema.object({
  prompt: schema.string(),
  esqlQuery: schema.maybe(schema.string()),
  template: schema.maybe(schema.string()),
});

export const aiSummaryPanelEmbeddableSchema = schema.allOf([
  aiSummaryPanelStateSchema,
  serializedTitlesSchema,
]);

export type AiSummaryPanelState = TypeOf<typeof aiSummaryPanelStateSchema>;
export type AiSummaryPanelEmbeddableState = TypeOf<typeof aiSummaryPanelEmbeddableSchema>;

export const aiDashboardSummaryStateSchema = schema.object({
  customInstructions: schema.maybe(schema.string({ maxLength: 2_000 })),
  template: schema.maybe(schema.string()),
});

export const aiDashboardSummaryEmbeddableSchema = schema.allOf([
  aiDashboardSummaryStateSchema,
  serializedTitlesSchema,
]);

export type AiDashboardSummaryState = TypeOf<typeof aiDashboardSummaryStateSchema>;
export type AiDashboardSummaryEmbeddableState = TypeOf<typeof aiDashboardSummaryEmbeddableSchema>;
