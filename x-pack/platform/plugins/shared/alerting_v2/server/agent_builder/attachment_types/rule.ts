/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import {
  RULE_TYPE,
  ruleAttachmentDataSchema,
  type RuleAttachmentData,
} from '../../../common/attachment_types';

export const createRuleType = (): AttachmentTypeDefinition<
  typeof RULE_TYPE,
  RuleAttachmentData
> => ({
  id: RULE_TYPE,
  isReadonly: false,
  validate: (input) => {
    const result = ruleAttachmentDataSchema.safeParse(input);
    if (result.success) {
      return { valid: true, data: result.data };
    }
    return { valid: false, error: result.error.message };
  },
  format: (attachment) => ({
    getRepresentation: () => {
      const { data } = attachment;

      const lines: string[] = [
        `Proposed rule: "${data.metadata.name}" (attachment.id: "${attachment.id}")`,
        `Kind: ${data.kind}`,
        `Query: ${data.evaluation.query.base}`,
        `Schedule: every ${data.schedule.every}, lookback ${data.schedule.lookback}`,
        `Time field: ${data.timeField}`,
      ];

      if (data.evaluation.query.condition) {
        lines.push(`Condition: ${data.evaluation.query.condition}`);
      }
      if (data.grouping?.fields?.length) {
        lines.push(`Grouping: ${data.grouping.fields.join(', ')}`);
      }
      if (data.stateTransition) {
        const st = data.stateTransition;
        const parts: string[] = [];
        if (st.pendingCount != null) parts.push(`pending after ${st.pendingCount} breaches`);
        if (st.pendingTimeframe) parts.push(`within ${st.pendingTimeframe}`);
        if (st.recoveringCount != null) parts.push(`recovering after ${st.recoveringCount} clear`);
        if (st.recoveringTimeframe) parts.push(`within ${st.recoveringTimeframe}`);
        if (parts.length) lines.push(`State transitions: ${parts.join(', ')}`);
      }
      if (data.recoveryPolicy) {
        lines.push(`Recovery: ${data.recoveryPolicy.type}`);
      }
      if (data.sourceIndex) {
        lines.push(`Source index: ${data.sourceIndex}`);
      }
      if (data.metadata.description) {
        lines.push(`Description: ${data.metadata.description}`);
      }
      if (data.metadata.labels?.length) {
        lines.push(`Labels: ${data.metadata.labels.join(', ')}`);
      }

      return {
        type: 'text',
        value: lines.join('\n'),
      };
    },
  }),
  getAgentDescription: () =>
    'A proposed rule configuration attachment. Rendering it inline displays a summary card ' +
    'with the rule name, kind, schedule, and query. The Preview button opens the full ' +
    'interactive rule form where the user can review, edit, and create the rule. ' +
    'ALWAYS render these attachments inline using <render_attachment id="ATTACHMENT_ID"/> so the ' +
    'user sees the rule proposal card. Present a brief explanation alongside each rendered attachment.',
  getTools: () => [],
});
