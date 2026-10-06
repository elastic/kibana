/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { css } from '@emotion/react';
import { EuiSpacer, useEuiTheme } from '@elastic/eui';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { APPROVAL_MODAL_TRANSLATIONS } from './translations';

interface ApprovalStatusCalloutsProps {
  /** Only shown while still pending — a decided proposal's outcome banner already covers it. */
  isPending: boolean;
  /** Error from a prior run of this proposal's action, explaining why it is offered again. */
  previousExecutionError?: string;
  /**
   * Whether the proposal is expired — its deadline passed, or the workflow settled it as
   * `status: 'expired'` beforehand (e.g. after exhausting its retry attempts). The header badge
   * already says "Expired"; this adds the explanation the badge alone has no room for, worded to
   * hold for either cause since this flag does not distinguish them.
   */
  isExpired: boolean;
  'data-test-subj'?: string;
}

/**
 * The warning callouts `ApprovalContent` shows between the body and the footer: why a proposal is
 * being offered again after a failed attempt, and why an expired one can no longer be actioned.
 * Split out from `ApprovalContent` itself only because both conditions render the same
 * spacer-callout-spacer shape, not because they share any state.
 */
export const ApprovalStatusCallouts = memo<ApprovalStatusCalloutsProps>(
  ({ isPending, previousExecutionError, isExpired, 'data-test-subj': dataTestSubj }) => {
    const { euiTheme } = useEuiTheme();

    return (
      <>
        {/* Why this proposal is being offered again, when it is a retry. */}
        {isPending && previousExecutionError && (
          <>
            <EuiSpacer size="m" />
            <div css={css({ padding: `0 ${euiTheme.size.base}` })}>
              <KbnWarningCallout
                announceOnMount
                size="s"
                title={APPROVAL_MODAL_TRANSLATIONS.previousFailureCalloutTitle}
                data-test-subj={dataTestSubj ? `${dataTestSubj}-previous-failure` : undefined}
              >
                {previousExecutionError}
              </KbnWarningCallout>
              <EuiSpacer size="m" />
            </div>
          </>
        )}

        {isExpired && (
          <>
            <EuiSpacer size="m" />
            <div css={css({ padding: `0 ${euiTheme.size.base}` })}>
              <KbnWarningCallout
                announceOnMount
                size="s"
                title={APPROVAL_MODAL_TRANSLATIONS.expiredCalloutTitle}
                data-test-subj={dataTestSubj ? `${dataTestSubj}-expired` : undefined}
              />
              <EuiSpacer size="m" />
            </div>
          </>
        )}
      </>
    );
  }
);

ApprovalStatusCallouts.displayName = 'ApprovalStatusCallouts';
