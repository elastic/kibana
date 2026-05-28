/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPrompt, type ToolDefinition } from '@kbn/inference-common';
import { z } from '@kbn/zod/v4';
import systemPromptTemplate from './system_prompt.text';
import userPromptTemplate from './user_prompt.text';
import rcaMethodology from '../shared/rca_methodology.text';
import { insightsSchema, SUBMIT_INSIGHTS_TOOL_NAME } from '../../client/insight_tool';

const buildSystemPrompt = (systemPromptSuffix?: string) => {
  const parts = [systemPromptTemplate, rcaMethodology];
  if (systemPromptSuffix) {
    parts.push(systemPromptSuffix);
  }
  return parts.join('\n');
};

export const createSummarizeStreamsPrompt = ({
  additionalTools,
  systemPromptSuffix,
}: {
  additionalTools?: Record<string, ToolDefinition>;
  systemPromptSuffix?: string;
} = {}) =>
  createPrompt({
    name: 'summarize_streams',
    input: z.object({
      streamInsights: z.string(),
    }),
  })
    .version({
      system: {
        mustache: {
          template: buildSystemPrompt(systemPromptSuffix),
        },
      },
      template: {
        mustache: {
          template: userPromptTemplate,
        },
      },
      tools: {
        [SUBMIT_INSIGHTS_TOOL_NAME]: {
          description: 'Submit system-level insights correlating across streams',
          schema: insightsSchema,
        },
        ...(additionalTools ?? {}),
      } as const,
    })
    .get();

/** @deprecated Use createSummarizeStreamsPrompt() instead */
export const SummarizeStreamsPrompt = createSummarizeStreamsPrompt();
