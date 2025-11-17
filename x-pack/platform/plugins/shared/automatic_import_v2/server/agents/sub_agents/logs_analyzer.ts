/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SubAgent, SubAgentParams } from '../types';
import { LOG_ANALYZER_PROMPT } from '../prompts';

/**
 * Creates a logs analyzer agent.
 * This agent analyzes the log format and provides a structured analysis for ingest pipeline generation.
 *
 * @returns Logs analyzer agent configured with the provided parameters
 */
export const createLogsAnalyzerAgent = (
  params: Omit<SubAgentParams, 'name' | 'description' | 'sampleCount'>
): SubAgent => {
  const userPrompt = params.prompt;
  return {
    name: 'logs_analyzer',
    description:
      'Analyzes the log format and provides a structured analysis for ingest pipeline generation.',
    prompt: LOG_ANALYZER_PROMPT + (userPrompt ? `\n\n${userPrompt}` : ''),
    tools: params.tools,
  };
};
