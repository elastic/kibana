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
import { RULE_ATTACHMENT_TYPE, type RuleAttachmentData } from '@kbn/alerting-v2-schemas';
import type { RuleApiResponse } from '../services/rules_api';
import { registerAutoAttach, type AttachmentConverter } from './auto_attach';

export type PendingRuleAttachment = AttachmentInput<
  typeof RULE_ATTACHMENT_TYPE,
  RuleAttachmentData
>;

export const ruleAttachmentConverter: AttachmentConverter<RuleApiResponse> = {
  toAttachment: (rule): PendingRuleAttachment => ({
    id: `rule:${rule.id}`,
    type: RULE_ATTACHMENT_TYPE,
    origin: rule.id,
    data: rule,
  }),
  getOrigin: (rule) => rule.id,
};

export const registerRuleAutoAttach = ({
  agentBuilder,
  chrome,
  focusedRule$,
}: {
  agentBuilder: AgentBuilderPluginStart;
  chrome: ChromeStart;
  focusedRule$: Observable<RuleApiResponse | undefined>;
}): (() => void) =>
  registerAutoAttach({
    agentBuilder,
    chrome,
    focusedItem$: focusedRule$,
    converter: ruleAttachmentConverter,
  });
