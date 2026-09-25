/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBadgeProps, IconType } from '@elastic/eui';
import { APPROVAL_MODAL_TRANSLATIONS } from './translations';

/** What a primary action resolves to once its promise settles. */
export type ApprovalOutcomeStatus = 'applied' | 'declined';

/**
 * Where a decision sits right now: awaiting one, in flight, or settled. Drives the header badge,
 * the outcome banner, and whether the footer shows buttons or an identity row — the same states
 * whether this is `ApprovalModal`'s own history or the live transition after a click.
 *
 * `'applying'` covers both the approve call itself being in flight and, once that call has
 * returned, the action it started still executing — approving only resumes the gate workflow,
 * whose post-gate steps run the action and write the real outcome afterward. `'failed'` and
 * `'no_action'` are both read back from the proposal's own `status`, never asserted
 * optimistically: nothing client-side knows an action failed, or that a proposal carried none to
 * run, until the server says so. `'no_action'` is distinct from `'applied'` for exactly that
 * reason — an approved proposal with nothing to run never executes anything, so folding it into
 * `'applied'` would claim an automated action succeeded when none was ever going to happen.
 */
export type ApprovalPhase =
  | 'pending'
  | 'applying'
  | 'declining'
  | ApprovalOutcomeStatus
  | 'failed'
  | 'no_action';

export interface ApprovalOutcomeBadge {
  color: EuiBadgeProps['color'];
  iconType: IconType;
  label: string;
  isLoading: boolean;
}

export interface ApprovalOutcomeBanner {
  color: 'success' | 'primary' | 'danger';
  title: string;
  hint?: string;
  /** Swaps the icon for a spinner, for a decision that is still being submitted. */
  isLoading: boolean;
}

const IN_PROGRESS_HINT = APPROVAL_MODAL_TRANSLATIONS.inProgressHint;

/** `undefined` for `pending`: that state keeps whatever badge/caption the caller already renders. */
export const getApprovalOutcomeBadge = (phase: ApprovalPhase): ApprovalOutcomeBadge | undefined => {
  switch (phase) {
    case 'applied':
      return {
        color: 'success',
        iconType: 'check',
        label: APPROVAL_MODAL_TRANSLATIONS.appliedBadge,
        isLoading: false,
      };
    case 'declined':
      return {
        color: 'default',
        iconType: 'cross',
        label: APPROVAL_MODAL_TRANSLATIONS.declinedBadge,
        isLoading: false,
      };
    case 'applying':
      return {
        color: 'primary',
        iconType: 'clock',
        label: APPROVAL_MODAL_TRANSLATIONS.applyingBadge,
        isLoading: true,
      };
    case 'declining':
      return {
        color: 'primary',
        iconType: 'clock',
        label: APPROVAL_MODAL_TRANSLATIONS.decliningBadge,
        isLoading: true,
      };
    case 'failed':
      return {
        color: 'danger',
        iconType: 'warning',
        label: APPROVAL_MODAL_TRANSLATIONS.failedBadge,
        isLoading: false,
      };
    case 'no_action':
      return {
        color: 'default',
        iconType: 'check',
        label: APPROVAL_MODAL_TRANSLATIONS.noActionBadge,
        isLoading: false,
      };
    default:
      return undefined;
  }
};

export const getApprovalOutcomeBanner = (
  phase: ApprovalPhase
): ApprovalOutcomeBanner | undefined => {
  switch (phase) {
    case 'applied':
      return {
        color: 'success',
        title: APPROVAL_MODAL_TRANSLATIONS.appliedBannerTitle,
        isLoading: false,
      };
    case 'declined':
      return {
        color: 'primary',
        title: APPROVAL_MODAL_TRANSLATIONS.declinedBannerTitle,
        isLoading: false,
      };
    case 'applying':
      return {
        color: 'primary',
        title: APPROVAL_MODAL_TRANSLATIONS.applyingBannerTitle,
        hint: IN_PROGRESS_HINT,
        isLoading: true,
      };
    case 'declining':
      return {
        color: 'primary',
        title: APPROVAL_MODAL_TRANSLATIONS.decliningBannerTitle,
        hint: IN_PROGRESS_HINT,
        isLoading: true,
      };
    case 'failed':
      return {
        color: 'danger',
        title: APPROVAL_MODAL_TRANSLATIONS.failedBannerTitle,
        isLoading: false,
      };
    case 'no_action':
      return {
        color: 'primary',
        title: APPROVAL_MODAL_TRANSLATIONS.noActionBannerTitle,
        isLoading: false,
      };
    default:
      return undefined;
  }
};
