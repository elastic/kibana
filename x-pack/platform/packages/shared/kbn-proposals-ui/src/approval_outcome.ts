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
 */
export type ApprovalPhase = 'pending' | 'applying' | 'declining' | ApprovalOutcomeStatus;

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
    default:
      return undefined;
  }
};

export const getApprovalOutcomeBanner = (
  phase: ApprovalPhase
): ApprovalOutcomeBanner | undefined => {
  switch (phase) {
    case 'applied':
      return { color: 'success', title: APPROVAL_MODAL_TRANSLATIONS.appliedBannerTitle };
    case 'declined':
      return { color: 'primary', title: APPROVAL_MODAL_TRANSLATIONS.declinedBannerTitle };
    case 'applying':
      return {
        color: 'primary',
        title: APPROVAL_MODAL_TRANSLATIONS.applyingBannerTitle,
        hint: IN_PROGRESS_HINT,
      };
    case 'declining':
      return {
        color: 'primary',
        title: APPROVAL_MODAL_TRANSLATIONS.decliningBannerTitle,
        hint: IN_PROGRESS_HINT,
      };
    default:
      return undefined;
  }
};
