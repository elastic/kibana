/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LlmProxy } from '@kbn/ftr-llm-proxy';
import { ALERTING_TOOL_IDS } from '@kbn/alerting-v2-constants';
import {
  mockFinalAnswerRenderingAttachment,
  mockToolResultCall,
  toLlmToolName,
} from '../../../common/ui/fixtures/llm_mocks';

const DRAFT_CUSTOM_RULE_LLM_TOOL_NAME = toLlmToolName(ALERTING_TOOL_IDS.draftCustomRule);

/** Answers the next tool result with a `draft_custom_rule` call applying `operations`. */
export const mockDraftCustomRule = (proxy: LlmProxy, operations: Array<Record<string, unknown>>) =>
  mockToolResultCall(proxy, 'agent:draft_custom_rule', DRAFT_CUSTOM_RULE_LLM_TOOL_NAME, {
    operations,
  });

/** Renders the rule attachment created by the preceding `draft_custom_rule` tool result. */
export const mockFinalAnswerRenderingRuleAttachment = (proxy: LlmProxy, answer: string) =>
  mockFinalAnswerRenderingAttachment(proxy, answer, 'ruleAttachment');
