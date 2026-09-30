/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconType, EuiButtonColor } from '@elastic/eui';
import type { ProposalWithMetadata, DismissReason } from '@kbn/proposals-common';

/** Impact vocabulary an action and a proposal share. */
export type ApprovalProposalImpact = NonNullable<ProposalWithMetadata['impact']>;

export interface ApprovalAction {
  label: string;
  onClick: () => void | Promise<void>;
  /** Overrides the component-level {@link ApprovalContentProps.iconType} on the button. */
  iconType?: IconType;
  color?: EuiButtonColor;
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
  label: React.ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
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
  | 'expired'
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
