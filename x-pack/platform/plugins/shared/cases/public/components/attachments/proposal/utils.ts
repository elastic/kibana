/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProposalWithMetadata } from '@kbn/proposals-common';
import type { CaseUI } from '../../../../common';
import { PROPOSAL_ATTACHMENT_TYPE } from '../../../../common/constants/attachments';
import { ProposalAttachmentMetadataSchema } from '../../../../common/types/domain/attachment/proposal/v2';

export interface AttachedProposal {
  proposalId: string;
  rootProposalId: string;
  title: string;
}

export interface ProposalRow {
  /** The attached proposal. */
  proposal: ProposalWithMetadata;
  /** The chain's live revision, when it is a later one than the attached proposal. */
  latestRevision?: ProposalWithMetadata;
}

/** The proposals attached to a case, in the order they were attached. */
export const getAttachedProposals = (comments: CaseUI['comments']): AttachedProposal[] =>
  comments.flatMap((comment) => {
    // Cast to a loose shape: these fields exist only on some members of the comment union.
    const { type, attachmentId, metadata } = comment as {
      type?: string;
      attachmentId?: string | string[];
      metadata?: unknown;
    };
    if (type !== PROPOSAL_ATTACHMENT_TYPE || typeof attachmentId !== 'string') {
      return [];
    }
    const parsed = ProposalAttachmentMetadataSchema.safeParse(metadata);
    return parsed.success
      ? [
          {
            proposalId: attachmentId,
            rootProposalId: parsed.data.rootProposalId,
            title: parsed.data.title,
          },
        ]
      : [];
  });

const isLive = ({ supersededBy, status }: ProposalWithMetadata): boolean =>
  supersededBy === undefined && status !== 'superseded';

/** The live head of a chain: its highest unreplaced revision, the newer one on a tie. */
const getChainHead = (chain: readonly ProposalWithMetadata[]): ProposalWithMetadata | undefined =>
  chain
    .filter(isLive)
    .sort(
      (a, b) => (b.revision ?? 1) - (a.revision ?? 1) || b.createdAt.localeCompare(a.createdAt)
    )[0];

/**
 * One row per attached proposal that could be read, so rows match the case's attachments. A
 * proposal that could not be read is left out, as the alerts table leaves out a missing alert.
 */
export const toProposalRows = (
  attached: readonly AttachedProposal[],
  proposals: readonly ProposalWithMetadata[]
): ProposalRow[] => {
  const byId = new Map(proposals.map((proposal) => [proposal.id, proposal]));
  const shown = new Set<string>();

  return attached.flatMap(({ proposalId }) => {
    const proposal = byId.get(proposalId);
    if (!proposal || shown.has(proposal.id)) {
      return [];
    }
    shown.add(proposal.id);

    const rootId = proposal.rootProposalId ?? proposal.id;
    const head = getChainHead(proposals.filter((p) => (p.rootProposalId ?? p.id) === rootId));
    return [{ proposal, latestRevision: head && head.id !== proposal.id ? head : undefined }];
  });
};

/** Matches the attached proposal's title or its latest revision's. */
export const matchesSearchTerm = (
  { proposal, latestRevision }: ProposalRow,
  searchTerm?: string
): boolean => {
  if (!searchTerm) {
    return true;
  }
  const term = searchTerm.toLowerCase();
  return [proposal, latestRevision].some((p) => p?.title.toLowerCase().includes(term));
};
