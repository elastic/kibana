/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiAccordion,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiMarkdownFormat,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { InvestigationHypothesis, InvestigationState } from '@kbn/significant-events-schema';
import type { InvestigationOutputProps, InvestigationStatus } from './types';

type Header =
  | { spinner: true; title: string }
  | { spinner: false; icon: string; color: 'success' | 'danger' | 'warning'; title: string };

const getRunningHeadline = (state: InvestigationState | undefined): string => {
  const hypotheses = state?.hypotheses ?? [];
  if (hypotheses.length === 0) {
    return i18n.translate('xpack.investigationOutput.gatheringEvidenceTitle', {
      defaultMessage: 'Gathering evidence',
    });
  }
  const hasInvestigating = hypotheses.some((h) => h.status === 'investigating');
  if (hasInvestigating) {
    return i18n.translate('xpack.investigationOutput.evaluatingHypothesesTitle', {
      defaultMessage: 'Evaluating {count} {count, plural, one {hypothesis} other {hypotheses}}',
      values: { count: hypotheses.length },
    });
  }
  return i18n.translate('xpack.investigationOutput.concludingTitle', {
    defaultMessage: 'Concluding',
  });
};

const getHeader = (status: InvestigationStatus, state?: InvestigationState): Header => {
  switch (status) {
    case 'running':
      return { spinner: true, title: getRunningHeadline(state) };
    case 'loading':
      return {
        spinner: true,
        title: i18n.translate('xpack.investigationOutput.loadingResultTitle', {
          defaultMessage: 'Loading investigation result…',
        }),
      };
    case 'failed':
      return {
        spinner: false,
        icon: 'errorFilled',
        color: 'danger',
        title: i18n.translate('xpack.investigationOutput.failedStatusTitle', {
          defaultMessage: 'Investigation failed',
        }),
      };
    case 'unavailable':
      return {
        spinner: false,
        icon: 'warning',
        color: 'warning',
        title: i18n.translate('xpack.investigationOutput.unavailableStatusTitle', {
          defaultMessage: 'Investigation result unavailable',
        }),
      };
    case 'complete':
      return {
        spinner: false,
        icon: 'checkInCircleFilled',
        color: 'success',
        title: i18n.translate('xpack.investigationOutput.successStatusTitle', {
          defaultMessage: 'Investigation complete',
        }),
      };
  }
};

/** Builds the markdown shown for the final result: the agent's own `conclusion` markdown
 * (already containing its own `## Conclusion` / `## Next Steps` sections), followed by a
 * `## Gaps Found` section when the agent reported any. */
const buildFinalResultsMarkdown = (state: InvestigationState): string | undefined => {
  const sections: string[] = [];

  if (state.conclusion) {
    sections.push(state.conclusion);
  }

  if (state.gaps_found && state.gaps_found.length > 0) {
    const gapsTitle = i18n.translate('xpack.investigationOutput.gapsFoundTitle', {
      defaultMessage: 'Gaps found',
    });
    sections.push([`## ${gapsTitle}`, ...state.gaps_found.map((gap) => `- ${gap}`)].join('\n'));
  }

  return sections.length > 0 ? sections.join('\n\n') : undefined;
};

const HYPOTHESIS_STATUS_ICON: Record<InvestigationHypothesis['status'], string> = {
  investigating: 'clock',
  dismissed: 'cross',
  confirmed: 'checkInCircleFilled',
};

const HYPOTHESIS_STATUS_COLOR: Record<
  InvestigationHypothesis['status'],
  'subdued' | 'success' | 'default'
> = {
  investigating: 'subdued',
  dismissed: 'subdued',
  confirmed: 'success',
};

const truncatedTitleCss = css`
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  min-width: 0;
`;

const HypothesisRow: React.FC<{ hypothesis: InvestigationHypothesis }> = ({ hypothesis }) => {
  const { candidate, confidence, status, reason } = hypothesis;
  const accordionId = useGeneratedHtmlId({ prefix: 'investigationHypothesis' });

  return (
    <EuiAccordion
      id={accordionId}
      data-test-subj="investigationOutputHypothesis"
      paddingSize="s"
      buttonContent={
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            {status === 'investigating' ? (
              <EuiLoadingSpinner size="s" />
            ) : (
              <EuiIcon
                type={HYPOTHESIS_STATUS_ICON[status]}
                color={HYPOTHESIS_STATUS_COLOR[status]}
                data-test-subj={`investigationOutputHypothesisStatus-${status}`}
                aria-hidden={true}
              />
            )}
          </EuiFlexItem>
          <EuiFlexItem css={truncatedTitleCss}>
            <EuiText size="s" color={HYPOTHESIS_STATUS_COLOR[status]} css={truncatedTitleCss}>
              <strong>{candidate}</strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow" data-test-subj="investigationOutputConfidenceBadge">
              <FormattedMessage
                id="xpack.investigationOutput.hypothesisConfidenceBadgeLabel"
                defaultMessage="{confidence, number, percent}"
                values={{ confidence }}
              />
            </EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
    >
      <EuiText size="xs" color="subdued">
        <p>
          {reason ??
            i18n.translate('xpack.investigationOutput.noReasonRecordedDescription', {
              defaultMessage: 'No reasoning recorded yet.',
            })}
        </p>
      </EuiText>
    </EuiAccordion>
  );
};

/**
 * Renders the summary and output of an investigation (a root-cause-analysis run by an AI
 * agent), whether it is still running, has completed, or has failed. Meant to be embedded
 * anywhere an investigation's status needs to be shown — it takes no dependencies beyond
 * its props, so callers own how the underlying data (live or final `state`) is fetched. Pair
 * with {@link useInvestigationState} to source `state` correctly for both cases.
 */
export const InvestigationOutput: React.FC<InvestigationOutputProps> = ({
  status,
  state,
  error,
}) => {
  const hypotheses = state?.hypotheses ?? [];
  const finalResultsMarkdown = state ? buildFinalResultsMarkdown(state) : undefined;
  const header = getHeader(status, state);

  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj="investigationOutput">
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          {header.spinner ? (
            <EuiLoadingSpinner size="m" data-test-subj="investigationOutputLoadingSpinner" />
          ) : (
            <EuiIcon type={header.icon} color={header.color} aria-hidden={true} />
          )}
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h3>{header.title}</h3>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>

      {error && (
        <>
          <EuiSpacer size="s" />
          <EuiText
            size="s"
            color={status === 'unavailable' ? 'warning' : 'danger'}
            data-test-subj="investigationOutputError"
          >
            <p>{error}</p>
          </EuiText>
        </>
      )}

      {state?.summary && (
        <>
          <EuiSpacer size="s" />
          <EuiText size="s" color="subdued">
            <p>{state.summary}</p>
          </EuiText>
        </>
      )}

      <EuiSpacer size="s" />

      {hypotheses.length === 0 ? (
        <EuiText size="s" color="subdued" data-test-subj="investigationOutputNoHypotheses">
          <p>
            {status === 'running'
              ? i18n.translate('xpack.investigationOutput.noHypothesesYetDescription', {
                  defaultMessage: 'No hypotheses have been considered yet.',
                })
              : i18n.translate('xpack.investigationOutput.noHypothesesRecordedDescription', {
                  defaultMessage: 'No hypotheses were recorded for this investigation.',
                })}
          </p>
        </EuiText>
      ) : (
        <EuiFlexGroup
          direction="column"
          gutterSize="s"
          data-test-subj="investigationOutputHypotheses"
        >
          {hypotheses.map((hypothesis) => (
            <EuiFlexItem key={hypothesis.candidate} grow={false}>
              <HypothesisRow hypothesis={hypothesis} />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      )}

      {finalResultsMarkdown && (
        <>
          <EuiSpacer size="m" />
          <EuiMarkdownFormat textSize="s" data-test-subj="investigationOutputFinalResults">
            {finalResultsMarkdown}
          </EuiMarkdownFormat>
        </>
      )}
    </EuiPanel>
  );
};
