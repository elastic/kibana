/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ModelProvider } from '@kbn/agent-builder-server';

export type CustomContentMode = 'data' | 'static';

const MODE_SCHEMA = {
  type: 'object',
  properties: {
    mode: {
      type: 'string',
      enum: ['data', 'static'],
      description:
        '"data" when the panel shows live Elasticsearch values. "static" only when it has no data at all.',
    },
  },
  required: ['mode'],
} as const;

const SYSTEM_PROMPT = `Classify whether a custom content panel needs live Elasticsearch data.

Return "static" only when the panel has no live values at all — a banner, a legend, an explanatory note, a decorative header, a title card.
Return "data" when it shows any live values — KPI cards, status boards, counts, rates, lists of entities, or anything that should update with the data.

When in doubt, return "data". Static is never a fallback for a panel that might need a query.`;

/**
 * Decides whether a custom content panel is query-backed. Unparseable structured
 * output returns "data"; model or connector failures throw so the caller can
 * choose a fallback that matches whether the panel already exists.
 */
export const classifyCustomContentMode = async ({
  prompt,
  modelProvider,
}: {
  prompt: string;
  modelProvider: ModelProvider;
}): Promise<CustomContentMode> => {
  const { inferenceClient } = await modelProvider.selectModel({ effortLevel: 'low' });
  const response = await inferenceClient.output({
    id: 'classify_custom_content_mode',
    system: SYSTEM_PROMPT,
    input: prompt,
    schema: MODE_SCHEMA,
  });
  return response.output?.mode === 'static' ? 'static' : 'data';
};
