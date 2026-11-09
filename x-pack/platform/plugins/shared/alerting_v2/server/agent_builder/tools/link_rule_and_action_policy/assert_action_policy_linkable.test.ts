/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERTING_TOOL_IDS } from '@kbn/alerting-v2-constants';
import type { ActionPolicyAttachmentData } from '@kbn/alerting-v2-schemas';
import type { AttachmentDraft } from '../../../lib/attachments_client';
import { assertActionPolicyLinkable } from './assert_action_policy_linkable';
import { LinkValidationError } from './link_validation_error';

const draft = (
  matcher?: Record<string, unknown>,
  overrides: Partial<AttachmentDraft<ActionPolicyAttachmentData>> = {}
): AttachmentDraft<ActionPolicyAttachmentData> => ({
  attachmentId: 'policy-att',
  isNew: false,
  data: { name: 'Notify', matcher } as Partial<ActionPolicyAttachmentData>,
  ...overrides,
});

describe('assertActionPolicyLinkable', () => {
  it('returns the matcher and its tags', () => {
    const matcher = { tags: ['team-a'], expression: 'severity: critical' };

    expect(assertActionPolicyLinkable(draft(matcher), 'policy-att')).toEqual({
      matcher,
      tags: ['team-a'],
      warnings: [],
    });
  });

  it('allows an unsaved catch-all draft', () => {
    expect(assertActionPolicyLinkable(draft(undefined), 'policy-att')).toEqual({
      matcher: undefined,
      tags: [],
      warnings: [],
    });
  });

  it('allows a saved policy that already has matcher tags', () => {
    const saved = draft({ tags: ['team-a'] }, { origin: 'policy-1' });

    expect(assertActionPolicyLinkable(saved, 'policy-att').tags).toEqual(['team-a']);
  });

  it('rejects a missing action policy attachment', () => {
    expect(() =>
      assertActionPolicyLinkable(draft(undefined, { isNew: true }), 'policy-att')
    ).toThrow(
      new LinkValidationError(
        `Action policy attachment "policy-att" was not found. Create it with ${ALERTING_TOOL_IDS.manageActionPolicy} first.`
      )
    );
  });

  it.each([
    ['no matcher', undefined],
    ['an expression-only matcher', { expression: 'severity: critical' }],
  ])('allows a saved catch-all policy with %s but warns about narrowing it', (_label, matcher) => {
    const { warnings } = assertActionPolicyLinkable(
      draft(matcher, { origin: 'policy-1' }),
      'policy-att'
    );

    expect(warnings).toEqual([expect.stringContaining('other rules will stop notifying')]);
  });
});
