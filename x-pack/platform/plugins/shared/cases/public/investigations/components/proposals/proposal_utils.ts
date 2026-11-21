/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PROPOSAL_CATEGORIES } from '../../../../common/investigations/types';
import type {
  Argument,
  Disruption,
  EvidenceItem,
  ProposalCategory,
  ProposalItem,
} from '../../../../common/investigations/types';
import * as i18n from './translations';

export const CATEGORY_COLORS: Record<
  ProposalCategory,
  'danger' | 'warning' | 'primary' | 'default'
> = {
  Contain: 'danger',
  Block: 'warning',
  Escalate: 'warning',
  'Collect evidence': 'primary',
  'Tune detection': 'default',
};

export const CATEGORY_LABELS: Record<ProposalCategory, string> = {
  Contain: i18n.CATEGORY_CONTAIN,
  Block: i18n.CATEGORY_BLOCK,
  Escalate: i18n.CATEGORY_ESCALATE,
  'Collect evidence': i18n.CATEGORY_COLLECT_EVIDENCE,
  'Tune detection': i18n.CATEGORY_TUNE_DETECTION,
};

const DISRUPTION_RANK: Record<Disruption, number> = { high: 0, medium: 1, low: 2 };

const refNumber = (ref: string): number => {
  const parsed = Number.parseInt(ref.replace(/\D/g, ''), 10);
  return Number.isNaN(parsed) ? 0 : parsed;
};

/** Pending first, then response actions first (category order), most disruptive first. */
export const sortProposals = (proposals: readonly ProposalItem[]): ProposalItem[] =>
  [...proposals].sort((a, b) => {
    const pendingA = a.status === 'pending' ? 0 : 1;
    const pendingB = b.status === 'pending' ? 0 : 1;
    return (
      pendingA - pendingB ||
      PROPOSAL_CATEGORIES.indexOf(a.proposal.category) -
        PROPOSAL_CATEGORIES.indexOf(b.proposal.category) ||
      DISRUPTION_RANK[a.proposal.disruption] - DISRUPTION_RANK[b.proposal.disruption] ||
      refNumber(a.ref) - refNumber(b.ref)
    );
  });

/** An argument made from the proposal and its evidence when the agent stored none. */
export const buildProposalArgument = (
  proposal: ProposalItem,
  evidenceById: ReadonlyMap<string, EvidenceItem>
): Argument => {
  const { proposal: details } = proposal;
  const linked = details.evidence_ids
    .map((id) => evidenceById.get(id))
    .filter((item): item is EvidenceItem => item !== undefined);

  return {
    kind: 'Proposed action',
    by: proposal.created_by.name,
    when: proposal.created_at,
    strength: 'Moderate',
    confidence: null,
    claim: proposal.title,
    condition: i18n.ARGUMENT_CONDITION,
    grounds: linked.map((item) => ({
      text: item.title,
      evidence: [item.ref],
      source: item.evidence.source.label,
      weight: 2 as const,
    })),
    steps: [
      {
        text: details.effect,
        evidence: linked.map(({ ref }) => ref),
        source: i18n.ARGUMENT_SOURCE,
        so: i18n.ARGUMENT_SO,
      },
    ],
    warrant: null,
    rebuttals: [],
    against: [],
    gaps: [],
    changes: i18n.ARGUMENT_CHANGES,
  };
};
