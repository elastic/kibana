/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QuickPrompt } from '../..';

export const MOCK_QUICK_PROMPTS: QuickPrompt[] = [
  {
    title: 'ALERT_SUMMARIZATION_TITLE',
    prompt: 'ALERT_SUMMARIZATION_PROMPT',
    color: '#F68FBE',
    categories: ['PROMPT_CONTEXT_ALERT_CATEGORY'],
    isDefault: true,
  },
  {
    title: 'RULE_CREATION_TITLE',
    prompt: 'RULE_CREATION_PROMPT',
    categories: ['PROMPT_CONTEXT_DETECTION_RULES_CATEGORY'],
    color: '#7DDED8',
    isDefault: true,
  },
  {
    title: 'WORKFLOW_ANALYSIS_TITLE',
    prompt: 'WORKFLOW_ANALYSIS_PROMPT',
    color: '#36A2EF',
    isDefault: true,
  },
  {
    title: 'THREAT_INVESTIGATION_GUIDES_TITLE',
    prompt: 'THREAT_INVESTIGATION_GUIDES_PROMPT',
    categories: ['PROMPT_CONTEXT_EVENT_CATEGORY'],
    color: '#F3D371',
    isDefault: true,
  },
  {
    title: 'SPL_QUERY_CONVERSION_TITLE',
    prompt: 'SPL_QUERY_CONVERSION_PROMPT',
    color: '#BADA55',
    isDefault: true,
  },
  {
    title: 'AUTOMATION_TITLE',
    prompt: 'AUTOMATION_PROMPT',
    color: '#FFA500',
    isDefault: true,
  },
  {
    title: 'A_CUSTOM_OPTION',
    prompt: 'quickly prompt please',
    color: '#D36086',
    categories: [],
  },
];
