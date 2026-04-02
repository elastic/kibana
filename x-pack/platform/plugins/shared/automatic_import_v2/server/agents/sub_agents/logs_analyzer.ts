/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SubAgent, SubAgentParams } from '../types';
import { LOG_AND_ECS_ANALYZER_PROMPT } from '../prompts';

/**
 * Creates a log and ECS analyzer agent.
 * This agent analyzes the log format, provides a structured analysis for ingest pipeline
 * generation, and produces best-effort ECS field mappings.
 *
 * @returns Log and ECS analyzer agent configured with the provided parameters
 */
export const createLogAndEcsAnalyzerAgent = (
  params: Omit<SubAgentParams, 'name' | 'description' | 'sampleCount'>
): SubAgent => {
  const userPrompt = params.prompt;
  return {
    name: 'log_and_ecs_analyzer',
    description:
      'Analyzes the log format, provides structured analysis for ingest pipeline generation, and produces best-effort ECS field mappings.',
    prompt: LOG_AND_ECS_ANALYZER_PROMPT + (userPrompt ? `\n\n${userPrompt}` : ''),
    tools: params.tools,
  };
};
