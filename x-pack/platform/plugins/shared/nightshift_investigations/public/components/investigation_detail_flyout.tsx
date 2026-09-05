/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React from 'react';
import type { ComponentProps } from 'react';
import {
  EuiBadge,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  FinalResults,
  HypothesisRow,
  type InvestigationDiscoverParams,
} from '@kbn/investigation-output';
import type { InvestigationState } from '@kbn/significant-events-schema';
import { NightshiftMarkIcon } from './nightshift_mark_icon';
import type { GetInvestigationResponse } from '../../../common';
import { InvestigationRunStatusBadge } from './investigation_run_status_badge';

/**
 * Bridges `GetInvestigationResponse` (where `summary` and `hypotheses` are optional —
 * they may not yet exist mid-run) to `InvestigationState` (which requires both).
 * Defaults are safe: an empty summary shows nothing; empty hypotheses render nothing.
 */
function toInvestigationState(inv: GetInvestigationResponse): InvestigationState {
  return {
    summary: inv.summary ?? '',
    hypotheses: inv.hypotheses ?? [],
    conclusion: inv.conclusion,
    recommendations: inv.recommendations,
    blind_spots: inv.blind_spots,
  };
}

export interface InvestigationDetailFlyoutProps {
  investigation: GetInvestigationResponse | null;
  isLoading: boolean;
  error: Error | null;
  onClose: () => void;
  /** Pass-through to EuiFlyout; use to add share URL, EBT tracking, etc. */
  flyoutMenuProps?: ComponentProps<typeof EuiFlyout>['flyoutMenuProps'];
  onClickCapture?: React.MouseEventHandler<HTMLElement>;
  /**
   * Optional: builds a Discover href for evidence links inside hypotheses.
   * When absent, evidence items render as plain text with no link.
   */
  getQueryHref?: (params: InvestigationDiscoverParams) => string | undefined;
}

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? i18n.translate('xpack.nightshiftInvestigations.flyout.unknownTime', {
        defaultMessage: 'Unknown time',
      })
    : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

const formatDuration = (startedAt: string, endedAt: string): string => {
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  const mins = Math.max(0, Math.round(ms / 60_000));
  if (mins < 60) {
    return i18n.translate('xpack.nightshiftInvestigations.flyout.durationMinutes', {
      defaultMessage: '{mins} min',
      values: { mins },
    });
  }
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0
    ? i18n.translate('xpack.nightshiftInvestigations.flyout.durationHoursMinutes', {
        defaultMessage: '{hrs}h {rem}m',
        values: { hrs, rem },
      })
    : i18n.translate('xpack.nightshiftInvestigations.flyout.durationHours', {
        defaultMessage: '{hrs}h',
        values: { hrs },
      });
};

function SectionTitle({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <EuiTitle size="xs">
      <h3>{children}</h3>
    </EuiTitle>
  );
}

const getPrimaryText = (investigation: GetInvestigationResponse): string =>
  investigation.subject.summary?.trim() ||
  investigation.subject.id ||
  investigation.investigation_id;

export function InvestigationDetailFlyout({
  investigation,
  isLoading,
  error,
  onClose,
  flyoutMenuProps,
  onClickCapture,
  getQueryHref,
}: InvestigationDetailFlyoutProps): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const primaryText = investigation
    ? getPrimaryText(investigation)
    : i18n.translate('xpack.nightshiftInvestigations.flyout.loading', {
        defaultMessage: 'Loading…',
      });

  const renderBody = () => {
    if (isLoading && !investigation) {
      return (
        <EuiFlexGroup justifyContent="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="l" />
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    if (error && !investigation) {
      return (
        <EuiCallOut
          announceOnMount
          color="warning"
          size="s"
          title={i18n.translate('xpack.nightshiftInvestigations.flyout.loadError', {
            defaultMessage: 'Unable to load investigation',
          })}
        />
      );
    }

    if (!investigation) {
      return null;
    }

    const invState = toInvestigationState(investigation);

    return (
      <>
        {investigation.summary && (
          <>
            <SectionTitle>
              {i18n.translate('xpack.nightshiftInvestigations.flyout.summaryTitle', {
                defaultMessage: 'Summary',
              })}
            </SectionTitle>
            <EuiSpacer size="s" />
            <EuiText size="s">
              <p>{investigation.summary}</p>
            </EuiText>
            <EuiSpacer size="l" />
          </>
        )}

        <SectionTitle>
          {i18n.translate('xpack.nightshiftInvestigations.flyout.subjectTitle', {
            defaultMessage: 'Subject',
          })}
        </SectionTitle>
        <EuiSpacer size="s" />
        <EuiText size="s" color="subdued">
          <p>
            <span>{investigation.subject.type}</span>
            {' — '}
            <span
              className="eui-textTruncate"
              title={investigation.subject.id}
              css={css`
                display: inline-block;
                max-width: 100%;
                vertical-align: bottom;
              `}
            >
              {investigation.subject.id}
            </span>
          </p>
        </EuiText>
        <EuiSpacer size="l" />

        {invState.hypotheses.length > 0 && (
          <>
            <SectionTitle>
              {i18n.translate('xpack.nightshiftInvestigations.flyout.hypothesesTitle', {
                defaultMessage: 'Hypotheses',
              })}
            </SectionTitle>
            <EuiSpacer size="s" />
            <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
              {invState.hypotheses.map((hypothesis, index) => (
                <EuiFlexItem key={`${hypothesis.candidate}-${index}`}>
                  <HypothesisRow hypothesis={hypothesis} getQueryHref={getQueryHref} />
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
            <EuiSpacer size="l" />
          </>
        )}

        <FinalResults state={invState} />

        <EuiSpacer size="l" />
        <SectionTitle>
          {i18n.translate('xpack.nightshiftInvestigations.flyout.runDetailsTitle', {
            defaultMessage: 'Run details',
          })}
        </SectionTitle>
        <EuiSpacer size="s" />
        <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
          {investigation.executed_by && (
            <EuiFlexItem>
              <EuiText size="s" color="subdued">
                {i18n.translate('xpack.nightshiftInvestigations.flyout.executedBy', {
                  defaultMessage: 'Started by {executedBy}',
                  values: { executedBy: investigation.executed_by },
                })}
              </EuiText>
            </EuiFlexItem>
          )}
          {investigation.started_at && (
            <EuiFlexItem>
              <EuiText size="s" color="subdued">
                {investigation.completed_at
                  ? i18n.translate('xpack.nightshiftInvestigations.flyout.ranFor', {
                      defaultMessage: '{start} — ran for {duration}',
                      values: {
                        start: formatDate(investigation.started_at),
                        duration: formatDuration(
                          investigation.started_at,
                          investigation.completed_at
                        ),
                      },
                    })
                  : i18n.translate('xpack.nightshiftInvestigations.flyout.startedAt', {
                      defaultMessage: 'Started {start}',
                      values: { start: formatDate(investigation.started_at) },
                    })}
              </EuiText>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>

        {investigation.status === 'failed' && investigation.error && (
          <>
            <EuiSpacer size="s" />
            <EuiCallOut
              announceOnMount
              color="danger"
              size="s"
              title={i18n.translate('xpack.nightshiftInvestigations.flyout.failedTitle', {
                defaultMessage: 'Investigation failed',
              })}
            >
              <EuiText size="s">{investigation.error}</EuiText>
            </EuiCallOut>
          </>
        )}
      </>
    );
  };

  return (
    <EuiFlyout
      aria-label={primaryText}
      data-test-subj="nightshiftInvestigationDetailFlyout"
      flyoutMenuProps={flyoutMenuProps}
      onClickCapture={onClickCapture}
      onClose={onClose}
      resizable
      session="start"
      size="s"
      type="push"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2>{primaryText}</h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false} wrap>
          <EuiFlexItem grow={false}>
            <EuiBadge
              color="default"
              css={css`
                .euiBadge__text {
                  align-items: center;
                  display: inline-flex;
                  flex-wrap: nowrap;
                  gap: ${euiTheme.size.xs};
                  line-height: 1;
                }
              `}
            >
              <NightshiftMarkIcon inline size={14} />
              <span>
                {i18n.translate('xpack.nightshiftInvestigations.flyout.badge.investigationLabel', {
                  defaultMessage: 'Investigation',
                })}
              </span>
            </EuiBadge>
          </EuiFlexItem>
          {investigation && (
            <EuiFlexItem grow={false}>
              <InvestigationRunStatusBadge status={investigation.status} />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiText color="subdued" size="xs">
          {investigation ? formatDate(investigation.created_at) : ''}
        </EuiText>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>{renderBody()}</EuiFlyoutBody>
    </EuiFlyout>
  );
}
