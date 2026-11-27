/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ResolvedLink } from './resolve_link';
import { LinkRollbackError, saveLink } from './save_link';

const originalRuleData = { metadata: { name: 'High CPU' } };
const linkedRuleData = { metadata: { name: 'High CPU', routing_tags: ['tag-1'] } };
const linkedPolicyData = { name: 'Notify', matcher: { tags: ['tag-1'] } };

const resolved = {
  tag: 'tag-1',
  alreadyLinked: false,
  warnings: [],
  rule: {
    draft: { attachmentId: 'rule-att', isNew: false, data: originalRuleData },
    data: linkedRuleData,
  },
  policy: { draft: { attachmentId: 'policy-att', isNew: false, data: {} }, data: linkedPolicyData },
} as unknown as ResolvedLink;

const setup = () => {
  const rules = { saveDraft: jest.fn().mockResolvedValue({ id: 'rule-att', current_version: 2 }) };
  const actionPolicies = {
    saveDraft: jest.fn().mockResolvedValue({ id: 'policy-att', current_version: 3 }),
  };
  return { rules, actionPolicies, client: { rules, actionPolicies } as never };
};

describe('saveLink', () => {
  it('saves the rule first and then the policy', async () => {
    const { client, rules, actionPolicies } = setup();

    const saved = await saveLink(client, resolved);

    expect(rules.saveDraft).toHaveBeenCalledTimes(1);
    expect(rules.saveDraft).toHaveBeenCalledWith(resolved.rule.draft, linkedRuleData);
    expect(actionPolicies.saveDraft).toHaveBeenCalledWith(resolved.policy.draft, linkedPolicyData);
    expect(rules.saveDraft.mock.invocationCallOrder[0]).toBeLessThan(
      actionPolicies.saveDraft.mock.invocationCallOrder[0]
    );
    expect(saved.ruleAttachment.current_version).toBe(2);
    expect(saved.policyAttachment.current_version).toBe(3);
  });

  it('does not touch the policy when saving the rule fails', async () => {
    const { client, rules, actionPolicies } = setup();
    rules.saveDraft.mockRejectedValueOnce(new Error('rule boom'));

    await expect(saveLink(client, resolved)).rejects.toThrow('rule boom');
    expect(actionPolicies.saveDraft).not.toHaveBeenCalled();
  });

  it('restores the rule attachment and rethrows when the policy update fails', async () => {
    const { client, rules, actionPolicies } = setup();
    const policyError = new Error('policy boom');
    actionPolicies.saveDraft.mockRejectedValueOnce(policyError);

    await expect(saveLink(client, resolved)).rejects.toBe(policyError);

    expect(rules.saveDraft).toHaveBeenCalledTimes(2);
    expect(rules.saveDraft).toHaveBeenLastCalledWith(resolved.rule.draft, originalRuleData);
  });

  it('throws a LinkRollbackError when the rule cannot be restored', async () => {
    const { client, rules, actionPolicies } = setup();
    actionPolicies.saveDraft.mockRejectedValueOnce(new Error('policy boom'));
    rules.saveDraft
      .mockResolvedValueOnce({ id: 'rule-att', current_version: 2 })
      .mockRejectedValueOnce(new Error('rollback boom'));

    const promise = saveLink(client, resolved);

    await expect(promise).rejects.toBeInstanceOf(LinkRollbackError);
    await expect(promise).rejects.toThrow(/policy boom.*rollback boom/);
  });
});
