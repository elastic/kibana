/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SubAgent, SubAgentParams } from '../types';
import { LOG_ANALYZER_PROMPT } from '../prompts';

export interface CreateLogsAnalyzerAgentParams
  extends Omit<SubAgentParams, 'name' | 'description' | 'sampleCount'> {
  /** When set, used as the full system prompt (e.g. for GEPA evaluation overrides). */
  systemPromptOverride?: string;
}

/**
 * Creates a logs analyzer agent.
 * This agent analyzes the log format and provides a structured analysis for ingest pipeline generation.
 *
 * @returns Logs analyzer agent configured with the provided parameters
 */
export const createLogsAnalyzerAgent = (params: CreateLogsAnalyzerAgentParams): SubAgent => {
  const { prompt: userPrompt, systemPromptOverride } = params;
  const prompt =
    systemPromptOverride !== undefined
      ? systemPromptOverride
      : LOG_ANALYZER_PROMPT + (userPrompt ? `\n\n${userPrompt}` : '');
  return {
    name: 'logs_analyzer',
    description:
      'Analyzes the log format and provides a structured analysis for ingest pipeline generation.',
    prompt,
    tools: params.tools,
  };
};
