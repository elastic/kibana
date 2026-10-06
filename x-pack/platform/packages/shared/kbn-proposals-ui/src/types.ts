/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import type { IconType, EuiButtonColor } from '@elastic/eui';
import type { ProposalWithMetadata, DismissReason } from '@kbn/proposals-common';
import type { ApprovalPhase } from './approval_outcome';

/** Impact vocabulary an action and a proposal share. */
export type ApprovalProposalImpact = NonNullable<ProposalWithMetadata['impact']>;

export interface ApprovalAction {
  label: string;
  onClick: () => void | Promise<void>;
  iconType?: IconType;
  color?: EuiButtonColor;
  fill?: boolean;
  isDisabled?: boolean;
  isLoading?: boolean;
  'data-test-subj'?: string;
}

export interface DeclineParams {
  dismissReason: DismissReason;
  rationale?: string;
}

export interface AlwaysAllowOption {
  id: string;
  label: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/**
 * A proposal already decided, read from the real record rather than assumed from a click.
 * `status` admits `'applying'`/`'failed'` alongside `'applied'`/`'declined'`: approving only
 * resumes the gate workflow, whose post-gate steps run the action, so a decided proposal can
 * still read `executing` or `failed` once that real record is what supplies this.
 */
export interface ApprovalDecision {
  status: Exclude<ApprovalPhase, 'pending'>;
  /**
   * Omitted when nobody actually decided — an expired gate timed out rather than being approved or
   * declined by anyone. Callers fall back to their own plain caption rather than rendering a
   * fabricated "by Unknown" for an outcome no one chose.
   */
  actorName?: string;
  /** ISO 8601 timestamp. Optional: the record itself may carry none — see `ApprovalActorTime`. */
  decidedAt?: string;
  /** Shown in the outcome banner, e.g. why a decline was made. */
  reason?: ReactNode;
}

/**
 * The part of a proposal the approval UI reads. Narrowed rather than widened to
 * the whole record, so a component cannot quietly start depending on a field
 * the host does not have to supply.
 */
export type ApprovalProposal = Pick<
  ProposalWithMetadata,
  | 'title'
  | 'comment'
  | 'impact'
  | 'status'
  | 'supersededBy'
  | 'category'
  | 'expiresAt'
  | 'actionWorkflowId'
  | 'action'
  | 'decision'
  | 'decidedBy'
  | 'decidedAt'
  | 'dismissReason'
  | 'rationale'
  | 'previousExecutionError'
>;
