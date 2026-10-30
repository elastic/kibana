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
  mockToolResultCallOnAttachment,
  toLlmToolName,
} from '../../../common/ui/fixtures/llm_mocks';

const MANAGE_RULE_LLM_TOOL_NAME = toLlmToolName(ALERTING_TOOL_IDS.manageRule);
const ATTACH_RULE_LLM_TOOL_NAME = toLlmToolName(ALERTING_TOOL_IDS.attachRule);

/** Answers the next tool result with a `manage_rule` call applying `operations`. */
export const mockManageRule = (proxy: LlmProxy, operations: Array<Record<string, unknown>>) =>
  mockToolResultCall(proxy, 'agent:manage_rule', MANAGE_RULE_LLM_TOOL_NAME, { operations });

/** Answers the next tool result with an `attach_rule` call for the saved rule `ruleId`. */
export const mockAttachRule = (proxy: LlmProxy, ruleId: string) =>
  mockToolResultCall(proxy, 'agent:attach_rule', ATTACH_RULE_LLM_TOOL_NAME, { ruleId });

/** Answers the `attach_rule` result with a `manage_rule` call editing the attached rule. */
export const mockManageAttachedRule = (
  proxy: LlmProxy,
  operations: Array<Record<string, unknown>>
) =>
  mockToolResultCallOnAttachment(
    proxy,
    'agent:manage_attached_rule',
    MANAGE_RULE_LLM_TOOL_NAME,
    'ruleAttachmentId',
    { operations }
  );

/** Renders `version` of the rule attachment from the preceding `manage_rule` tool result. */
export const mockFinalAnswerRenderingRuleAttachment = (
  proxy: LlmProxy,
  answer: string,
  version?: number
) => mockFinalAnswerRenderingAttachment(proxy, answer, 'ruleAttachment', version);
