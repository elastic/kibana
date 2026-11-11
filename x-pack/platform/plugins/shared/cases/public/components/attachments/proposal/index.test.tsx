/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Capabilities } from '@kbn/core/public';
import { PROPOSAL_ATTACHMENT_TYPE } from '../../../../common/constants/attachments';
import { getProposalAttachmentType } from '.';

const withCapabilities = (proposals?: Record<string, boolean>) => ({
  capabilities: { proposals } as unknown as Capabilities,
});

describe('getProposalAttachmentType', () => {
  const type = getProposalAttachmentType();

  it('registers a list view and an activity view', () => {
    expect(type.id).toBe(PROPOSAL_ATTACHMENT_TYPE);
    expect(type.getLabel()).toBe('Proposals');
    expect(type.getAttachmentList?.()?.children).toBeDefined();
  });

  it('is not offered to workflow steps or the agent tool', () => {
    expect(type.workflowSchema).toBe(false);
  });

  it('is enabled only for a viewer who can read proposals', () => {
    expect(type.isEnabled?.(withCapabilities({ showProposals: true }))).toBe(true);
    expect(type.isEnabled?.(withCapabilities({ showProposals: false }))).toBe(false);
    // The proposals feature grants nothing below its minimum license, or when it is disabled.
    expect(type.isEnabled?.(withCapabilities())).toBe(false);
  });

  it('validates a reference payload with its chain root', () => {
    const payload = {
      type: PROPOSAL_ATTACHMENT_TYPE,
      owner: 'securitySolution',
      attachmentId: 'p-1',
      metadata: { title: 'Tune noisy rule', rootProposalId: 'p-1' },
    };
    expect(type.schema.safeParse(payload).success).toBe(true);
    expect(
      type.schema.safeParse({ ...payload, metadata: { title: 'Tune noisy rule' } }).success
    ).toBe(false);
  });
});
