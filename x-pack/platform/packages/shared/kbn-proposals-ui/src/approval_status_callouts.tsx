/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect, useState } from 'react';
import { css } from '@emotion/react';
import { EuiCallOut, EuiSpacer, useEuiTheme } from '@elastic/eui';
import { APPROVAL_MODAL_TRANSLATIONS } from './translations';
import { InlineCalloutTitle } from './inline_callout_title';
import {
  EXPIRES_SOON_WINDOW_MS,
  formatDateTime,
  hasDeadlinePassed,
  isExpiringSoon,
} from './proposal_helpers';

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
  /** Why it can no longer be decided, as the flyout row captions it (`getExpiredCaption`). */
  expiredCaption?: string;
  /** Replaced by a successor: read-only, and the callout says why there is nothing to decide. */
  isReplaced?: boolean;
  /** ISO 8601 deadline, when the proposal carries one: the callout says when it expired. */
  expiresAt?: string;
  /** ISO 8601 deadline of a proposal still awaiting a decision: a warning says when, if it is within a day. */
  upcomingExpiry?: string;
  /** The user cannot decide: an undecided proposal they have no permission to approve. */
  isRestricted?: boolean;
  'data-test-subj'?: string;
}

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

/** The longest delay `setTimeout` accepts. */
const MAX_TIMEOUT_MS = 2 ** 31 - 1;

/**
 * Renders again when a deadline enters its warning window, and again when it passes, so a
 * callout left open does not keep showing what was true when it opened.
 */
const useRerenderAtExpiryBoundaries = (expiresAt: string | undefined) => {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (expiresAt === undefined) {
      return;
    }
    const deadline = new Date(expiresAt).getTime();
    const now = Date.now();
    const next = [deadline - EXPIRES_SOON_WINDOW_MS, deadline].find((at) => at > now);
    if (next === undefined) {
      return;
    }
    const id = setTimeout(() => setTick((tick) => tick + 1), Math.min(next - now, MAX_TIMEOUT_MS));
    return () => clearTimeout(id);
  });
};

/**
 * The callouts `ApprovalContent` shows between the body and the footer: why a proposal is offered
 * again after a failed attempt, when it expires, why the user cannot decide it, why a replaced
 * attempt failed, and why an expired one can no longer be applied. Split out from
 * `ApprovalContent` itself only because every condition renders the same spacer-callout-spacer
 * shape, not because they share any state.
 */
export const ApprovalStatusCallouts = memo<ApprovalStatusCalloutsProps>(
  ({
    isPending,
    previousExecutionError,
    failedAttemptError,
    isExpired,
    expiredCaption,
    expiresAt,
    upcomingExpiry,
    isRestricted = false,
    isReplaced = false,
    'data-test-subj': dataTestSubj,
  }) => {
    useRerenderAtExpiryBoundaries(upcomingExpiry ?? expiresAt);
    const deadlinePassed = hasDeadlinePassed({ expiresAt });
    const testSubj = (suffix: string) => (dataTestSubj ? `${dataTestSubj}-${suffix}` : undefined);

    return (
      <>
        {/* Why this proposal is being offered again, when a revision follows a failed attempt. */}
        {isPending && previousExecutionError && (
          <StatusCallout
            color="danger"
            title={APPROVAL_MODAL_TRANSLATIONS.previousFailureCalloutTitle}
            description={previousExecutionError}
            data-test-subj={testSubj('previous-failure')}
          />
        )}

        {upcomingExpiry && isExpiringSoon({ expiresAt: upcomingExpiry }) && (
          <StatusCallout
            color="warning"
            title={APPROVAL_MODAL_TRANSLATIONS.expiresSoonCalloutTitle}
            description={formatDateTime(upcomingExpiry)}
            data-test-subj={testSubj('expires')}
          />
        )}

        {isRestricted && (
          <StatusCallout
            color="warning"
            title={APPROVAL_MODAL_TRANSLATIONS.restrictedCalloutBody}
            data-test-subj={testSubj('restricted')}
          />
        )}

        {isReplaced && !isExpired && !failedAttemptError && (
          // Looks exactly like the callout of a replaced proposal nobody decided.
          <StatusCallout
            color="warning"
            title={APPROVAL_MODAL_TRANSLATIONS.replacedCalloutTitle}
            data-test-subj={testSubj('replaced')}
          />
        )}

        {failedAttemptError && (
          <StatusCallout
            color="danger"
            title={APPROVAL_MODAL_TRANSLATIONS.failedAndReplacedCalloutTitle}
            description={failedAttemptError}
            data-test-subj={testSubj('failed-attempt')}
          />
        )}

        {isExpired && (
          <StatusCallout
            color="warning"
            title={
              isReplaced
                ? APPROVAL_MODAL_TRANSLATIONS.replacedCalloutTitle
                : APPROVAL_MODAL_TRANSLATIONS.expiredCalloutTitle
            }
            // Why, the same text the card shows, then when (only once the deadline has really
            // passed). The generic "can no longer be applied" is the title's own message already.
            description={
              isReplaced
                ? undefined
                : [
                    expiredCaption !== APPROVAL_MODAL_TRANSLATIONS.expiredGenericCaption
                      ? expiredCaption
                      : undefined,
                    expiresAt && deadlinePassed ? formatDateTime(expiresAt) : undefined,
                  ]
                    .filter(Boolean)
                    .join('. ') || undefined
            }
            data-test-subj={testSubj('expired')}
          />
        )}
      </>
    );
  }
);

ApprovalStatusCallouts.displayName = 'ApprovalStatusCallouts';
