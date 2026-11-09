/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProposalWithMetadata } from '@kbn/proposals-common';
import type { CaseUI } from '../../../../common';
import { PROPOSAL_ATTACHMENT_TYPE } from '../../../../common/constants/attachments';
import { getAttachedProposals, matchesSearchTerm, toProposalRows } from './utils';

const proposal = (overrides: Partial<ProposalWithMetadata>): ProposalWithMetadata =>
  ({
    id: 'p-1',
    rootProposalId: 'p-1',
    revision: 1,
    title: 'Tune noisy rule',
    status: 'pending',
    createdAt: '2026-11-01T00:00:00.000Z',
    conversationId: 'conv-1',
    ...overrides,
  } as ProposalWithMetadata);

const attached = (proposalId: string, rootProposalId = proposalId) => ({
  proposalId,
  rootProposalId,
  title: 'Tune noisy rule',
});

describe('getAttachedProposals', () => {
  it('reads proposal attachments and skips other types', () => {
    const comments = [
      {
        type: PROPOSAL_ATTACHMENT_TYPE,
        attachmentId: 'p-2',
        metadata: { title: 'Isolate host', rootProposalId: 'p-1' },
      },
      { type: 'comment', comment: 'hello' },
      // Missing the root id the table needs, so it cannot be read as a chain.
      { type: PROPOSAL_ATTACHMENT_TYPE, attachmentId: 'p-3', metadata: { title: 'x' } },
    ] as unknown as CaseUI['comments'];

    expect(getAttachedProposals(comments)).toEqual([
      { proposalId: 'p-2', rootProposalId: 'p-1', title: 'Isolate host' },
    ]);
  });
});

describe('toProposalRows', () => {
  it('leaves out an attached proposal that could not be read', () => {
    expect(toProposalRows([attached('p-1'), attached('gone')], [proposal({})])).toEqual([
      { proposal: proposal({}), latestRevision: undefined },
    ]);
  });

  it('nests the live revision under an attached proposal that was revised', () => {
    const original = proposal({ status: 'superseded', supersededBy: 'p-2' });
    const revision = proposal({ id: 'p-2', supersedes: 'p-1', revision: 2 });

    expect(toProposalRows([attached('p-1')], [revision, original])).toEqual([
      { proposal: original, latestRevision: revision },
    ]);
  });

  it('keeps one row per attachment when a revision is attached too', () => {
    const original = proposal({ status: 'superseded', supersededBy: 'p-2' });
    const revision = proposal({ id: 'p-2', revision: 2 });

    expect(
      toProposalRows([attached('p-1'), attached('p-2', 'p-1')], [original, revision])
    ).toEqual([
      { proposal: original, latestRevision: revision },
      { proposal: revision, latestRevision: undefined },
    ]);
  });
});

describe('matchesSearchTerm', () => {
  it('matches the title case-insensitively', () => {
    const row = { proposal: proposal({}) };
    expect(matchesSearchTerm(row, 'NOISY')).toBe(true);
    expect(matchesSearchTerm(row, 'isolate')).toBe(false);
    expect(matchesSearchTerm(row)).toBe(true);
  });

  it("matches the latest revision's title too", () => {
    const row = {
      proposal: proposal({}),
      latestRevision: proposal({ id: 'p-2', title: 'Isolate host' }),
    };
    expect(matchesSearchTerm(row, 'isolate')).toBe(true);
  });
});
