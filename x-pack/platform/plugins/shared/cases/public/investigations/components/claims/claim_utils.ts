/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Argument,
  ArgumentStrength,
  ClaimItem,
  ClaimStatus,
  EvidenceItem,
} from '../../../../common/investigations/types';
import * as i18n from './translations';

export const CLAIM_STATUSES: readonly ClaimStatus[] = [
  'open',
  'supported',
  'blocked',
  'refuted',
] as const;

export const CLAIM_STATUS_LABELS: Record<ClaimStatus, string> = {
  open: i18n.STATUS_OPEN,
  supported: i18n.STATUS_SUPPORTED,
  blocked: i18n.STATUS_BLOCKED,
  refuted: i18n.STATUS_REFUTED,
};

export const CLAIM_STATUS_COLORS: Record<
  ClaimStatus,
  'primary' | 'success' | 'danger' | 'default'
> = {
  open: 'primary',
  supported: 'success',
  blocked: 'danger',
  refuted: 'default',
};

export const STRENGTH_COLORS: Record<
  ArgumentStrength,
  'success' | 'primary' | 'warning' | 'danger' | 'default'
> = {
  Strong: 'success',
  Moderate: 'primary',
  Incomplete: 'warning',
  Unreviewed: 'warning',
  Blocked: 'danger',
  Unsupported: 'danger',
  Refuted: 'default',
};

export const STRENGTH_LABELS: Record<ArgumentStrength, string> = {
  Strong: i18n.STRENGTH_STRONG,
  Moderate: i18n.STRENGTH_MODERATE,
  Incomplete: i18n.STRENGTH_INCOMPLETE,
  Unreviewed: i18n.STRENGTH_UNREVIEWED,
  Blocked: i18n.STRENGTH_BLOCKED,
  Unsupported: i18n.STRENGTH_UNSUPPORTED,
  Refuted: i18n.STRENGTH_REFUTED,
};

const OPEN_STRENGTHS: readonly ArgumentStrength[] = [
  'Incomplete',
  'Blocked',
  'Unsupported',
  'Unreviewed',
];

/** True for arguments that are a current position rather than a conclusion. */
export const isOpenStrength = (strength: ArgumentStrength): boolean =>
  OPEN_STRENGTHS.includes(strength);

/** The conclusion when the claim is settled, the question otherwise. */
export const getClaimTitle = (claim: ClaimItem): string => {
  const { question, conclusion } = claim.claim;
  if (claim.status === 'supported' || claim.status === 'refuted') {
    return conclusion || question || claim.title;
  }
  return question || conclusion || claim.title;
};

/** How well the claim is backed: needs a conclusion, linked evidence and recorded reasoning. */
export const getClaimStrength = (claim: ClaimItem): ArgumentStrength => {
  const { status, claim: details } = claim;
  const evidenceCount = details.supporting_evidence_ids.length;
  if (status === 'supported') {
    if (details.reasoning && evidenceCount > 0) {
      return (details.confidence ?? 0) >= 85 ? 'Strong' : 'Moderate';
    }
    return evidenceCount > 0 ? 'Unreviewed' : 'Unsupported';
  }
  if (status === 'open') {
    return 'Incomplete';
  }
  return status === 'blocked' ? 'Blocked' : 'Refuted';
};

export const getClaimStatusLine = (claim: ClaimItem): string | null => {
  const { status, claim: details } = claim;
  if (status === 'open' || status === 'blocked') {
    return details.note || null;
  }
  const title = getClaimTitle(claim);
  return details.question && details.question !== title ? i18n.ANSWERS(details.question) : null;
};

/**
 * Arguments are stored as free-form JSON by agents, so lists or text may be missing. This
 * fills the gaps so the views can rely on the shape.
 */
export const normalizeArgument = (argument: Argument): Argument => ({
  ...argument,
  by: argument.by ?? '',
  when: argument.when ?? '',
  strength: argument.strength in STRENGTH_COLORS ? argument.strength : 'Incomplete',
  confidence: argument.confidence ?? null,
  claim: argument.claim ?? '',
  condition: argument.condition ?? '',
  grounds: (argument.grounds ?? []).map((entry) => ({
    ...entry,
    evidence: entry.evidence ?? [],
    source: entry.source ?? '',
    weight: entry.weight ?? 2,
  })),
  steps: (argument.steps ?? []).map((entry) => ({
    ...entry,
    evidence: entry.evidence ?? [],
    source: entry.source ?? '',
  })),
  warrant: argument.warrant ?? null,
  rebuttals: (argument.rebuttals ?? []).map((entry) => ({
    ...entry,
    evidence: entry.evidence ?? [],
    response: entry.response ?? '',
  })),
  against: (argument.against ?? []).map((entry) => ({
    ...entry,
    evidence: entry.evidence ?? [],
    weight: entry.weight ?? 2,
  })),
  gaps: (argument.gaps ?? []).map((entry) => ({
    ...entry,
    evidence: entry.evidence ?? [],
    weight: entry.weight ?? 2,
  })),
  changes: argument.changes ?? '',
});

/** All distinct evidence refs mentioned anywhere in an argument. */
export const collectArgumentRefs = (argument: Argument): string[] => {
  const refs = new Set<string>();
  [...argument.grounds, ...argument.against, ...argument.gaps, ...argument.steps].forEach(
    ({ evidence }) => evidence.forEach((ref) => refs.add(ref))
  );
  argument.rebuttals.forEach(({ evidence }) => evidence.forEach((ref) => refs.add(ref)));
  return Array.from(refs);
};

/** Number of distinct evidence items an argument leans on (grounds, counter-evidence, steps). */
export const countArgumentEvidence = (argument: Argument): number => {
  const refs = new Set<string>();
  [...argument.grounds, ...argument.against, ...argument.steps].forEach(({ evidence }) =>
    evidence.forEach((ref) => refs.add(ref))
  );
  return refs.size;
};

/** An argument made from the claim itself, used when the claim has no stored argument. */
export const buildClaimArgument = (
  claim: ClaimItem,
  evidenceById: ReadonlyMap<string, EvidenceItem>
): Argument => {
  const { status, claim: details } = claim;
  const linked = details.supporting_evidence_ids
    .map((id) => evidenceById.get(id))
    .filter((item): item is EvidenceItem => item !== undefined);
  const settled = status === 'supported' || status === 'refuted';
  const confidence = settled ? details.confidence ?? null : null;
  const refs = linked.map(({ ref }) => ref);

  return {
    kind: 'Claim',
    by: claim.created_by.name,
    when: claim.created_at,
    strength: getClaimStrength(claim),
    confidence,
    claim: getClaimTitle(claim),
    condition: details.needs_review
      ? i18n.CONDITION_AWAITING_REVIEW
      : status === 'open'
      ? i18n.CONDITION_NOT_SETTLED
      : status === 'blocked'
      ? i18n.CONDITION_BLOCKED
      : i18n.CONDITION_REVIEWED,
    grounds: linked.map((item) => ({
      text: item.title,
      evidence: [item.ref],
      source: item.evidence.source.label,
      weight: 2 as const,
    })),
    steps:
      details.reasoning && linked.length > 0
        ? [
            {
              text: i18n.STEP_LINKED_EVIDENCE,
              evidence: refs,
              source: i18n.SOURCE_LINKED_EVIDENCE,
              so: details.reasoning,
            },
          ]
        : [],
    warrant: null,
    rebuttals: [],
    against: [],
    gaps:
      status === 'open' || status === 'blocked'
        ? [
            {
              text: details.note || i18n.GAP_NOT_SETTLED,
              why: status === 'blocked' ? i18n.STATUS_BLOCKED : i18n.STATUS_OPEN,
              evidence: [],
              weight: 2 as const,
            },
          ]
        : details.reasoning
        ? []
        : [
            {
              text: i18n.GAP_NO_REASONING,
              why: i18n.GAP_NOT_RECORDED,
              evidence: [],
              weight: 2 as const,
            },
          ],
    changes: i18n.CLAIM_CHANGES,
  };
};

/** Strength and number of evidence items shown on the "Why" button of a claim. */
export const getClaimWhyStrength = (
  claim: ClaimItem
): { strength: ArgumentStrength; evidenceCount: number } => {
  const stored = claim.claim.argument ? normalizeArgument(claim.claim.argument) : null;
  return {
    strength: stored?.strength ?? getClaimStrength(claim),
    evidenceCount: stored
      ? countArgumentEvidence(stored)
      : claim.claim.supporting_evidence_ids.length,
  };
};
