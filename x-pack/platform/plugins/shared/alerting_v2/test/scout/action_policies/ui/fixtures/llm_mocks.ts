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

const MANAGE_ACTION_POLICY_LLM_TOOL_NAME = toLlmToolName(ALERTING_TOOL_IDS.manageActionPolicy);

/** Answers the next tool result with a `manage_action_policy` call applying `operations`. */
export const mockManageActionPolicy = (
  proxy: LlmProxy,
  operations: Array<Record<string, unknown>>
) =>
  mockToolResultCall(proxy, 'agent:manage_action_policy', MANAGE_ACTION_POLICY_LLM_TOOL_NAME, {
    operations,
  });

/** Renders the action policy attachment created by the preceding `manage_action_policy` tool result. */
export const mockFinalAnswerRenderingActionPolicyAttachment = (proxy: LlmProxy, answer: string) =>
  mockFinalAnswerRenderingAttachment(proxy, answer, 'actionPolicyAttachment');
