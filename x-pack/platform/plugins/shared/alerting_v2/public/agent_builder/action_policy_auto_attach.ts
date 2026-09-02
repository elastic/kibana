/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import type { ChromeStart } from '@kbn/core/public';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import {
  ACTION_POLICY_ATTACHMENT_TYPE,
  type ActionPolicyAttachmentData,
  type ActionPolicyResponse,
} from '@kbn/alerting-v2-schemas';
import { registerAutoAttach, type AttachmentConverter } from './auto_attach';

export type PendingActionPolicyAttachment = AttachmentInput<
  typeof ACTION_POLICY_ATTACHMENT_TYPE,
  ActionPolicyAttachmentData
>;

const toAttachmentData = (policy: ActionPolicyResponse): ActionPolicyAttachmentData => ({
  id: policy.id,
  version: policy.version,
  name: policy.name,
  description: policy.description,
  destinations: policy.destinations,
  matcher: policy.matcher ?? undefined,
  group_by: policy.group_by ?? undefined,
  tags: policy.tags ?? undefined,
  grouping_mode: policy.grouping_mode ?? undefined,
  throttle: policy.throttle ?? undefined,
  enabled: policy.enabled,
  snoozed_until: policy.snoozed_until ?? undefined,
  updated_at: policy.updated_at,
});

export const actionPolicyAttachmentConverter: AttachmentConverter<ActionPolicyResponse> = {
  toAttachment: (policy): PendingActionPolicyAttachment => ({
    id: `action_policy:${policy.id}`,
    type: ACTION_POLICY_ATTACHMENT_TYPE,
    origin: policy.id,
    data: toAttachmentData(policy),
  }),
  getOrigin: (policy) => policy.id,
};

export const registerActionPolicyAutoAttach = ({
  agentBuilder,
  chrome,
  focusedActionPolicy$,
}: {
  agentBuilder: AgentBuilderPluginStart;
  chrome: ChromeStart;
  focusedActionPolicy$: Observable<ActionPolicyResponse | undefined>;
}): (() => void) =>
  registerAutoAttach({
    agentBuilder,
    chrome,
    focusedItem$: focusedActionPolicy$,
    converter: actionPolicyAttachmentConverter,
  });
