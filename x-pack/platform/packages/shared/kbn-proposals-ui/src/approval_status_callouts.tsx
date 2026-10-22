/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { css } from '@emotion/react';
import { EuiCallOut, EuiSpacer, useEuiTheme } from '@elastic/eui';
import moment from 'moment';
import { APPROVAL_MODAL_TRANSLATIONS } from './translations';
import { InlineCalloutTitle } from './inline_callout_title';
import { DATE_TIME_FORMAT, hasDeadlinePassed } from './proposal_helpers';

interface ApprovalStatusCalloutsProps {
  /** Only shown while still pending — a decided proposal's outcome banner already covers it. */
  isPending: boolean;
  /** Error from a prior run of this proposal's action, explaining why it is offered again. */
  previousExecutionError?: string;
  /**
   * Error from this proposal's own run, for a failed attempt that a retry replaced. A replaced
   * proposal shows no outcome banner, so without this its "Failed" badge would carry no reason.
   */
  failedAttemptError?: string;
  /**
   * Whether the proposal is expired — its deadline passed, or the workflow settled it as
   * `status: 'expired'` beforehand (e.g. after exhausting its retry attempts). The header badge
   * already says "Expired"; this adds the explanation the badge alone has no room for, worded to
   * hold for either cause since this flag does not distinguish them.
   */
  isExpired: boolean;
  /** Why the proposal expired, if known. */
  expiredReason?: string;
  /** Replaced by a successor: read-only, and the callout says why there is nothing to decide. */
  isReplaced?: boolean;
  /** ISO 8601 deadline, when the proposal carries one: the callout says when it expired. */
  expiresAt?: string;
  /** ISO 8601 deadline of a proposal still awaiting a decision: an info callout says when. */
  upcomingExpiry?: string;
  /** The user cannot decide: an undecided proposal they have no permission to approve. */
  isRestricted?: boolean;
  'data-test-subj'?: string;
}

/**
 * The callouts `ApprovalContent` shows between the body and the footer: why a proposal is
 * being offered again after a failed attempt, why a replaced attempt failed, and why an expired
 * one can no longer be actioned. Split out from `ApprovalContent` itself only because every
 * condition renders the same spacer-callout-spacer shape, not because they share any state.
 */
const formatDeadline = (iso: string): string => moment(iso).format(DATE_TIME_FORMAT);

interface StatusCalloutProps {
  color: 'danger' | 'warning' | 'primary';
  /** The state word, in the callout's own bold title. */
  title: string;
  /** Detail on the same line, in regular weight; omitted when the title says it all. */
  description?: string;
  'data-test-subj'?: string;
}

/**
 * One status callout in the shape every condition shares — spacer, padded callout, spacer — with
 * its title and description on a single line. EUI's own title stays bold; only the description is
 * set back to regular weight, so the state word reads first.
 */
const StatusCallout = ({
  color,
  title,
  description,
  'data-test-subj': dataTestSubj,
}: StatusCalloutProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    <>
      <EuiSpacer size="m" />
      <div css={css({ padding: `0 ${euiTheme.size.base}` })}>
        {/* eslint-disable-next-line @kbn/kbn-ui/prefer_kbn_ui_callout */}
        <EuiCallOut
          announceOnMount
          size="s"
          color={color}
          title={<InlineCalloutTitle title={title} description={description} />}
          data-test-subj={dataTestSubj}
        />
        <EuiSpacer size="m" />
      </div>
    </>
  );
};

export const ApprovalStatusCallouts = memo<ApprovalStatusCalloutsProps>(
  ({
    isPending,
    previousExecutionError,
    failedAttemptError,
    isExpired,
    expiredReason,
    expiresAt,
    upcomingExpiry,
    isRestricted = false,
    isReplaced = false,
    'data-test-subj': dataTestSubj,
  }) => {
    const deadlinePassed = hasDeadlinePassed({ expiresAt });
    const testSubj = (suffix: string) => (dataTestSubj ? `${dataTestSubj}-${suffix}` : undefined);

    return (
      <>
        {/* Why this proposal is being offered again, when it is a retry. */}
        {isPending && previousExecutionError && (
          <StatusCallout
            color="danger"
            title={APPROVAL_MODAL_TRANSLATIONS.previousFailureCalloutTitle}
            description={APPROVAL_MODAL_TRANSLATIONS.previousFailureCalloutBody(
              previousExecutionError
            )}
            data-test-subj={testSubj('previous-failure')}
          />
        )}

        {upcomingExpiry && (
          <StatusCallout
            color="primary"
            title={APPROVAL_MODAL_TRANSLATIONS.expiresCalloutTitle(formatDeadline(upcomingExpiry))}
            data-test-subj={testSubj('expires')}
          />
        )}

        {isRestricted && (
          <StatusCallout
            color="warning"
            title={APPROVAL_MODAL_TRANSLATIONS.restrictedCalloutTitle}
            description={APPROVAL_MODAL_TRANSLATIONS.restrictedCalloutBody}
            data-test-subj={testSubj('restricted')}
          />
        )}

        {isReplaced && !isExpired && (
          <StatusCallout
            color="primary"
            title={APPROVAL_MODAL_TRANSLATIONS.replacedCalloutTitle}
            description={APPROVAL_MODAL_TRANSLATIONS.replacedCalloutDescription}
            data-test-subj={testSubj('replaced')}
          />
        )}

        {failedAttemptError && (
          <StatusCallout
            color="danger"
            title={APPROVAL_MODAL_TRANSLATIONS.failedBannerTitle}
            description={failedAttemptError}
            data-test-subj={testSubj('failed-attempt')}
          />
        )}

        {isExpired && (
          <StatusCallout
            color="warning"
            title={
              isReplaced
                ? APPROVAL_MODAL_TRANSLATIONS.outdatedCalloutTitle
                : expiresAt && deadlinePassed
                ? APPROVAL_MODAL_TRANSLATIONS.expiredCalloutTitleOn(formatDeadline(expiresAt))
                : APPROVAL_MODAL_TRANSLATIONS.expiredCalloutTitle
            }
            // A stored reason already says why, so the timing is left out.
            description={
              isReplaced
                ? APPROVAL_MODAL_TRANSLATIONS.replacedCalloutDescription
                : expiredReason
                ? APPROVAL_MODAL_TRANSLATIONS.expiredCalloutDescriptionWithReason(expiredReason)
                : expiresAt && !deadlinePassed
                ? // Settled before its deadline (a failed workflow, say), so it did not time out.
                  APPROVAL_MODAL_TRANSLATIONS.expiredCalloutDescriptionGeneric
                : APPROVAL_MODAL_TRANSLATIONS.expiredCalloutDescription
            }
            data-test-subj={testSubj('expired')}
          />
        )}
      </>
    );
  }
);

ApprovalStatusCallouts.displayName = 'ApprovalStatusCallouts';
