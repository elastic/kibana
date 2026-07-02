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
  euiTextTruncate,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, FormattedRelativeTime } from '@kbn/i18n-react';
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
  dismissed: 'dashedCircle',
  confirmed: 'checkCircle',
};

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
                color="text"
                data-test-subj={`investigationOutputHypothesisStatus-${status}`}
                aria-hidden={true}
              />
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={true}>
            <EuiText size="xs" color="text">
              <strong>
                {i18n.translate('xpack.investigationOutput.hypothesis', {
                  defaultMessage: 'Hypothesis:',
                })}
              </strong>{' '}
              <span>{candidate}</span>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      extraAction={
        <EuiBadge
          color={status === 'confirmed' ? 'success' : 'hollow'}
          data-test-subj="investigationOutputConfidenceBadge"
        >
          <FormattedMessage
            id="xpack.investigationOutput.hypothesisConfidenceBadgeLabel"
            defaultMessage="{confidence, number, percent}"
            values={{ confidence }}
          />
        </EuiBadge>
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
  const { euiTheme } = useEuiTheme();

  return (
    <EuiPanel
      hasBorder
      paddingSize="none"
      data-test-subj="investigationOutput"
      css={css`
        padding-bottom: ${euiTheme.size.base};
      `}
    >
      <EuiFlexGroup
        alignItems="center"
        gutterSize="s"
        responsive={false}
        css={css`
          padding: ${euiTheme.size.base};
        `}
      >
        <EuiFlexItem grow={false}>
          {header.spinner ? (
            <EuiLoadingSpinner size="m" data-test-subj="investigationOutputLoadingSpinner" />
          ) : (
            <EuiIcon type={header.icon} size="m" color={header.color} aria-hidden={true} />
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={true}>
          <EuiTitle size="xxs">
            <h3>{header.title}</h3>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>

      {error && (
        <EuiText
          size="s"
          color={status === 'unavailable' ? 'warning' : 'danger'}
          data-test-subj="investigationOutputError"
          css={css`
            padding: 0 ${euiTheme.size.base};
          `}
        >
          <p>{error}</p>
        </EuiText>
      )}

      {state?.summary && (
        <EuiMarkdownFormat
          textSize="s"
          color="subdued"
          css={css`
            padding: 0 ${euiTheme.size.base} ${euiTheme.size.base};
          `}
        >
          {state.summary}
        </EuiMarkdownFormat>
      )}

      <EuiSpacer size="s" />

      {hypotheses.length === 0 ? (
        <EuiText
          size="s"
          color="subdued"
          data-test-subj="investigationOutputNoHypotheses"
          css={css`
            padding: 0 ${euiTheme.size.base};
          `}
        >
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
        <EuiPanel hasShadow={false} color="subdued" paddingSize="none">
          <EuiFlexGroup
            direction="column"
            gutterSize="none"
            data-test-subj="investigationOutputHypotheses"
          >
            {hypotheses.map((hypothesis, i) => (
              <EuiFlexItem
                key={hypothesis.candidate}
                grow={false}
                css={css`
                  border-top: ${i === 0 ? euiTheme.border.thin : 'none'};
                  border-bottom: ${euiTheme.border.thin};
                  padding: ${euiTheme.size.s} ${euiTheme.size.m};
                `}
              >
                <HypothesisRow hypothesis={hypothesis} />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </EuiPanel>
      )}

      {finalResultsMarkdown && (
        <EuiMarkdownFormat
          textSize="s"
          data-test-subj="investigationOutputFinalResults"
          css={css`
            padding: ${euiTheme.size.l} ${euiTheme.size.base} ${euiTheme.size.base};
          `}
        >
          {finalResultsMarkdown}
        </EuiMarkdownFormat>
      )}
    </EuiPanel>
  );
};
