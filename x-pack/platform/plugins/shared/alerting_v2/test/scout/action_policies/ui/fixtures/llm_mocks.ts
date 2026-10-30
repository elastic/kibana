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

const MANAGE_ACTION_POLICY_LLM_TOOL_NAME = toLlmToolName(ALERTING_TOOL_IDS.manageActionPolicy);
const ATTACH_ACTION_POLICY_LLM_TOOL_NAME = toLlmToolName(ALERTING_TOOL_IDS.attachActionPolicy);

/** Answers the next tool result with a `manage_action_policy` call applying `operations`. */
export const mockManageActionPolicy = (
  proxy: LlmProxy,
  operations: Array<Record<string, unknown>>
) =>
  mockToolResultCall(proxy, 'agent:manage_action_policy', MANAGE_ACTION_POLICY_LLM_TOOL_NAME, {
    operations,
  });

/** Answers the next tool result with an `attach_action_policy` call for the saved `policyId`. */
export const mockAttachActionPolicy = (proxy: LlmProxy, policyId: string) =>
  mockToolResultCall(proxy, 'agent:attach_action_policy', ATTACH_ACTION_POLICY_LLM_TOOL_NAME, {
    policyId,
  });

/** Answers the `attach_action_policy` result with a `manage_action_policy` call editing it. */
export const mockManageAttachedActionPolicy = (
  proxy: LlmProxy,
  operations: Array<Record<string, unknown>>
) =>
  mockToolResultCallOnAttachment(
    proxy,
    'agent:manage_attached_action_policy',
    MANAGE_ACTION_POLICY_LLM_TOOL_NAME,
    'actionPolicyAttachmentId',
    { operations }
  );

/** Renders `version` of the action policy attachment from the preceding `manage_action_policy` tool result. */
export const mockFinalAnswerRenderingActionPolicyAttachment = (
  proxy: LlmProxy,
  answer: string,
  version?: number
) => mockFinalAnswerRenderingAttachment(proxy, answer, 'actionPolicyAttachment', version);
