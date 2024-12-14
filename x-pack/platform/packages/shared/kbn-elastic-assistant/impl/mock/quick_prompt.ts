/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  PromptResponse,
  PromptTypeEnum,
} from '@kbn/elastic-assistant-common/impl/schemas/prompts/bulk_crud_prompts_route.gen';

export const MOCK_QUICK_PROMPTS: PromptResponse[] = [
  {
    name: 'ALERT_SUMMARIZATION_TITLE',
    content: 'ALERT_SUMMARIZATION_PROMPT',
    color: '#F68FBE',
    categories: ['PROMPT_CONTEXT_ALERT_CATEGORY'],
    isDefault: true,
    id: 'ALERT_SUMMARIZATION_TITLE',
    promptType: PromptTypeEnum.quick,
  },
  {
    name: 'RULE_CREATION_TITLE',
    content: 'RULE_CREATION_PROMPT',
    categories: ['PROMPT_CONTEXT_DETECTION_RULES_CATEGORY'],
    color: '#7DDED8',
    isDefault: true,
    id: 'RULE_CREATION_TITLE',
    promptType: PromptTypeEnum.quick,
  },
  {
    name: 'WORKFLOW_ANALYSIS_TITLE',
    content: 'WORKFLOW_ANALYSIS_PROMPT',
    color: '#36A2EF',
    isDefault: true,
    id: 'WORKFLOW_ANALYSIS_TITLE',
    promptType: PromptTypeEnum.quick,
  },
  {
    name: 'THREAT_INVESTIGATION_GUIDES_TITLE',
    content: 'THREAT_INVESTIGATION_GUIDES_PROMPT',
    categories: ['PROMPT_CONTEXT_EVENT_CATEGORY'],
    color: '#F3D371',
    isDefault: true,
    id: 'THREAT_INVESTIGATION_GUIDES_TITLE',
    promptType: PromptTypeEnum.quick,
  },
  {
    name: 'SPL_QUERY_CONVERSION_TITLE',
    content: 'SPL_QUERY_CONVERSION_PROMPT',
    color: '#BADA55',
    isDefault: true,
    id: 'SPL_QUERY_CONVERSION_TITLE',
    promptType: PromptTypeEnum.quick,
  },
  {
    name: 'AUTOMATION_TITLE',
    content: 'AUTOMATION_PROMPT',
    color: '#FFA500',
    isDefault: true,
    id: 'AUTOMATION_TITLE',
    promptType: PromptTypeEnum.quick,
  },
  {
    name: 'A_CUSTOM_OPTION',
    content: 'quickly prompt please',
    color: '#D36086',
    categories: [],
    id: 'A_CUSTOM_OPTION',
    promptType: PromptTypeEnum.quick,
  },
];
