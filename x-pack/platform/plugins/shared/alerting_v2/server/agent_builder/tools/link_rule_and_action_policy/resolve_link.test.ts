/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_TAGS } from '@kbn/alerting-v2-constants';
import type { ActionPolicyAttachmentData, RuleAttachmentData } from '@kbn/alerting-v2-schemas';
import { POLICY_MATCHER_TAGS_MAX } from '@kbn/alerting-v2-schemas';
import type { AttachmentDraft } from '../../../lib/attachments_client';
import { LinkValidationError } from './link_validation_error';
import { resolveLink } from './resolve_link';

const RULE_ID = '3f2a9c1b-7d4e-4a55-9c0e-1b2c3d4e5f60';
const TAG = 'high-cpu-3f2a9c1b';

const ruleDraft = (
  data: Partial<RuleAttachmentData>,
  overrides: Partial<AttachmentDraft<RuleAttachmentData>> = {}
): AttachmentDraft<RuleAttachmentData> => ({
  attachmentId: 'rule-att',
  isNew: false,
  data,
  ...overrides,
});

const policyDraft = (
  data: Partial<ActionPolicyAttachmentData>,
  overrides: Partial<AttachmentDraft<ActionPolicyAttachmentData>> = {}
): AttachmentDraft<ActionPolicyAttachmentData> => ({
  attachmentId: 'policy-att',
  isNew: false,
  data,
  ...overrides,
});

const validRule = (extra: Record<string, unknown> = {}): Partial<RuleAttachmentData> =>
  ({
    id: RULE_ID,
    kind: 'alert',
    metadata: { name: 'High CPU', ...extra },
  } as Partial<RuleAttachmentData>);

const policy = (matcher?: Record<string, unknown>): Partial<ActionPolicyAttachmentData> =>
  ({ name: 'Notify', matcher } as Partial<ActionPolicyAttachmentData>);

const resolve = (
  rule: AttachmentDraft<RuleAttachmentData>,
  policyD: AttachmentDraft<ActionPolicyAttachmentData>
) =>
  resolveLink(
    {
      rules: { getDraft: () => rule } as never,
      actionPolicies: { getDraft: () => policyD } as never,
    },
    { ruleAttachmentId: 'rule-att', policyAttachmentId: 'policy-att' }
  );

describe('resolveLink', () => {
  it('writes the generated tag on both the rule and the policy', () => {
    const result = resolve(ruleDraft(validRule()), policyDraft(policy()));

    expect(result.tag).toBe(TAG);
    expect(result.alreadyLinked).toBe(false);
    expect(result.rule.data.metadata?.routing_tags).toEqual([TAG]);
    expect(result.policy.data.matcher?.tags).toEqual([TAG]);
  });

  it('keeps existing tags, the matcher expression and the rest of the data', () => {
    const result = resolve(
      ruleDraft(validRule({ routing_tags: ['team-a'], tags: ['x'] })),
      policyDraft(policy({ tags: ['team-b'], expression: 'severity: critical' }))
    );

    expect(result.rule.data.metadata).toEqual({
      name: 'High CPU',
      tags: ['x'],
      routing_tags: ['team-a', TAG],
    });
    expect(result.policy.data.matcher).toEqual({
      tags: ['team-b', TAG],
      expression: 'severity: critical',
    });
    expect(result.policy.data.name).toBe('Notify');
  });

  it('allows a catch-all policy that is still an unsaved draft', () => {
    const result = resolve(ruleDraft(validRule()), policyDraft(policy(undefined)));

    expect(result.policy.data.matcher?.tags).toEqual([TAG]);
    expect(result.warnings).toEqual([]);
  });

  it('links a saved catch-all policy and returns a warning about narrowing it', () => {
    const result = resolve(
      ruleDraft(validRule()),
      policyDraft(policy(undefined), { origin: 'policy-1' })
    );

    expect(result.policy.data.matcher?.tags).toEqual([TAG]);
    expect(result.warnings).toEqual([expect.stringContaining('other rules will stop notifying')]);
  });

  it('allows appending to a saved policy that already has matcher tags', () => {
    const result = resolve(
      ruleDraft(validRule()),
      policyDraft(policy({ tags: ['team-b'] }), { origin: 'policy-1' })
    );

    expect(result.policy.data.matcher?.tags).toEqual(['team-b', TAG]);
  });

  it('is idempotent when the rule and the policy already share a tag', () => {
    const result = resolve(
      ruleDraft(validRule({ routing_tags: ['renamed-tag'] })),
      policyDraft(policy({ tags: ['renamed-tag'] }))
    );

    expect(result.alreadyLinked).toBe(true);
    expect(result.tag).toBe('renamed-tag');
    expect(result.rule.data.metadata?.routing_tags).toEqual(['renamed-tag']);
    expect(result.policy.data.matcher?.tags).toEqual(['renamed-tag']);
  });

  it('uses the persisted origin as the rule id for the suffix', () => {
    const rule = ruleDraft({ ...validRule(), id: undefined }, { origin: RULE_ID });

    expect(resolve(rule, policyDraft(policy())).tag).toBe(TAG);
  });

  describe('validation errors', () => {
    it('propagates the rule validation errors', () => {
      expect(() => resolve(ruleDraft({}, { isNew: true }), policyDraft(policy()))).toThrow(
        LinkValidationError
      );
    });

    it('propagates the action policy validation errors', () => {
      expect(() => resolve(ruleDraft(validRule()), policyDraft({}, { isNew: true }))).toThrow(
        LinkValidationError
      );
    });

    it('rejects when the rule is at the routing tag limit', () => {
      const routingTags = Array.from({ length: MAX_TAGS }, (_, i) => `tag-${i}`);

      expect(() =>
        resolve(ruleDraft(validRule({ routing_tags: routingTags })), policyDraft(policy()))
      ).toThrow(/already has 20 routing tags/);
    });

    it('rejects when the policy is at the matcher tag limit', () => {
      const tags = Array.from({ length: POLICY_MATCHER_TAGS_MAX }, (_, i) => `tag-${i}`);

      expect(() => resolve(ruleDraft(validRule()), policyDraft(policy({ tags })))).toThrow(
        /already has 50 matcher tags/
      );
    });
  });
});
