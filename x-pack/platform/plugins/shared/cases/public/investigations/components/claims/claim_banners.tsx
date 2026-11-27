/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiLink, EuiSpacer } from '@elastic/eui';
import type { ClaimItem } from '../../../../common/investigations/types';
import { ICONS } from '../../icons';
import { useClaimActions } from './use_claim_actions';
import * as i18n from './translations';

export interface ClaimBannersProps {
  recordId: string;
  claim: ClaimItem;
  /** False when the record is closed. */
  canEdit: boolean;
  onOpenReasoning: () => void;
}

/** Banners at the top of the claim flyout: closed, new evidence arrived, needs review. */
export const ClaimBanners: React.FC<ClaimBannersProps> = ({
  recordId,
  claim,
  canEdit,
  onOpenReasoning,
}) => {
  const { patchClaim, isUpdating } = useClaimActions(recordId);
  const { ref, claim: details } = claim;

  return (
    <>
      {!canEdit ? (
        <>
          <EuiCallOut
            announceOnMount
            size="s"
            iconType={ICONS.lock}
            title={i18n.CLOSED_READ_ONLY}
            data-test-subj="investigationClaimClosedNotice"
          />
          <EuiSpacer size="m" />
        </>
      ) : null}
      {details.stale_reason ? (
        <>
          <EuiCallOut
            announceOnMount
            color="warning"
            iconType={ICONS.stale}
            title={i18n.STALE_TITLE(details.stale_reason)}
            text={<p>{i18n.STALE_BODY}</p>}
            actionProps={
              canEdit
                ? {
                    primary: {
                      children: i18n.STILL_HOLDS,
                      isDisabled: isUpdating,
                      onClick: () =>
                        void patchClaim(
                          claim,
                          { claim: { stale_reason: null } },
                          i18n.STILL_HOLDS_DONE(ref)
                        ),
                      'data-test-subj': 'investigationClaimStillHolds',
                    },
                    secondary: {
                      children: i18n.RECHECK,
                      isDisabled: isUpdating,
                      onClick: () =>
                        void patchClaim(
                          claim,
                          {
                            status: 'open',
                            claim: {
                              note: i18n.REOPENED_AFTER_NEW_EVIDENCE,
                              stale_reason: null,
                              needs_review: false,
                              confidence: null,
                            },
                          },
                          i18n.RECHECK_DONE(ref)
                        ),
                      'data-test-subj': 'investigationClaimRecheck',
                    },
                  }
                : undefined
            }
            data-test-subj="investigationClaimStaleBanner"
          />
          <EuiSpacer size="m" />
        </>
      ) : null}
      {details.needs_review ? (
        <>
          <EuiCallOut
            announceOnMount
            color="warning"
            iconType={ICONS.reviewNeeded}
            title={i18n.REVIEW_TITLE(claim.updated_by.name)}
            text={
              <p>
                {i18n.REVIEW_BODY}{' '}
                <EuiLink onClick={onOpenReasoning} data-test-subj="investigationClaimOpenReasoning">
                  {i18n.OPEN_REASONING}
                </EuiLink>
              </p>
            }
            actionProps={
              canEdit
                ? {
                    primary: {
                      children: i18n.ACCEPT_CONCLUSION,
                      isDisabled: isUpdating,
                      onClick: () =>
                        void patchClaim(
                          claim,
                          { claim: { needs_review: false } },
                          i18n.ACCEPTED(ref)
                        ),
                      'data-test-subj': 'investigationClaimAccept',
                    },
                    secondary: {
                      children: i18n.REOPEN,
                      isDisabled: isUpdating,
                      onClick: () =>
                        void patchClaim(
                          claim,
                          { status: 'open', claim: { needs_review: false, stale_reason: null } },
                          i18n.REOPENED(ref)
                        ),
                      'data-test-subj': 'investigationClaimReopen',
                    },
                  }
                : undefined
            }
            data-test-subj="investigationClaimReviewBanner"
          />
          <EuiSpacer size="m" />
        </>
      ) : null}
    </>
  );
};
ClaimBanners.displayName = 'ClaimBanners';
