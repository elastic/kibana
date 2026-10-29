/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toolIdMaxLength, toolIdRegexp } from '@kbn/agent-builder-common';
import { RULE_BUILDER_TYPES } from '@kbn/alerting-v2-rule-builders';
import {
  getConvertToCustomRuleToolId,
  getDraftBuilderRuleToolId,
  getUpdateBuilderRuleToolId,
} from './tool_ids';

const attachmentId = '3f2b9c1e-6d4a-4f7b-9a1c-0e8d2b5a7c61';

describe('rule builder tool ids', () => {
  it.each(Object.values(RULE_BUILDER_TYPES))(
    'are valid tool ids for the $type builder',
    (builder) => {
      for (const id of [
        getDraftBuilderRuleToolId(builder),
        getUpdateBuilderRuleToolId(builder, attachmentId),
        getConvertToCustomRuleToolId(attachmentId),
      ]) {
        expect(id).toMatch(toolIdRegexp);
        expect(id.length).toBeLessThanOrEqual(toolIdMaxLength);
      }
    }
  );

  it('names the draft tool after the builder', () => {
    expect(getDraftBuilderRuleToolId({ type: 'threshold' })).toBe(
      'platform.alerting.draft_threshold_rule'
    );
  });

  it('suffixes attachment-bound tools with an id-safe prefix of the attachment id', () => {
    expect(getUpdateBuilderRuleToolId({ type: 'threshold' }, attachmentId)).toBe(
      'platform.alerting.update_threshold_rule_3f2b9c1e'
    );
    expect(getConvertToCustomRuleToolId('Rule_A-1')).toBe(
      'platform.alerting.convert_to_custom_rule_rulea1'
    );
  });

  it('falls back to a fixed suffix when the attachment id has no usable characters', () => {
    expect(getConvertToCustomRuleToolId('---')).toBe('platform.alerting.convert_to_custom_rule_0');
  });
});
