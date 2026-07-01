/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { InvestigationHypothesis, InvestigationState } from '@kbn/significant-events-schema';
import type { InvestigationOutputProps } from './types';

interface Header {
  spinner: boolean;
  icon?: string;
  color?: 'success' | 'danger';
  title: string;
}

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

const getHeader = ({
  isRunning,
  state,
  error,
}: {
  isRunning: boolean;
  state?: InvestigationState;
  error?: string;
}): Header => {
  if (isRunning) {
    return { spinner: true, title: getRunningHeadline(state) };
  }
  if (error && !state) {
    return {
      spinner: false,
      icon: 'errorFilled',
      color: 'danger',
      title: i18n.translate('xpack.investigationOutput.failedStatusTitle', {
        defaultMessage: 'Investigation failed',
      }),
    };
  }
  if (state) {
    return {
      spinner: false,
      icon: 'checkInCircleFilled',
      color: 'success',
      title: i18n.translate('xpack.investigationOutput.successStatusTitle', {
        defaultMessage: 'Investigation complete',
      }),
    };
  }
  return {
    spinner: true,
    title: i18n.translate('xpack.investigationOutput.loadingResultTitle', {
      defaultMessage: 'Loading investigation result…',
    }),
  };
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

const HypothesisRow: React.FC<{ hypothesis: InvestigationHypothesis }> = ({ hypothesis }) => {
  const { candidate, confidence, status, reason } = hypothesis;

  return (
    <div data-test-subj="investigationOutputHypothesis">
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          {status === 'investigating' ? (
            <EuiLoadingSpinner size="s" />
          ) : (
            <EuiIcon
              type={HYPOTHESIS_STATUS_ICON[status]}
              color={HYPOTHESIS_STATUS_COLOR[status]}
              data-test-subj={`investigationOutputHypothesisStatus-${status}`}
            />
          )}
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s" color={HYPOTHESIS_STATUS_COLOR[status]}>
            <p>
              <strong>{candidate}</strong>
            </p>
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
      {reason && (
        <EuiText size="xs" color="subdued">
          <p>{reason}</p>
        </EuiText>
      )}
    </div>
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
  isRunning,
  state,
  error,
  onOpenDetails,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const hypotheses = state?.hypotheses ?? [];
  const canOpenDetails = Boolean(state?.conclusion || (state?.gaps_found?.length ?? 0) > 0);

  const handleOpenDetailsClick = () => {
    if (onOpenDetails) {
      onOpenDetails();
    } else {
      setIsExpanded((expanded) => !expanded);
    }
  };

  const header = getHeader({ isRunning, state, error });

  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj="investigationOutput">
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          {header.spinner ? (
            <EuiLoadingSpinner size="m" data-test-subj="investigationOutputLoadingSpinner" />
          ) : (
            <EuiIcon type={header.icon!} color={header.color} />
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
          <EuiText size="s" color="danger" data-test-subj="investigationOutputError">
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
            {isRunning
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
          {hypotheses.map((hypothesis, index) => (
            <EuiFlexItem key={index} grow={false}>
              <HypothesisRow hypothesis={hypothesis} />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      )}

      {canOpenDetails && (
        <>
          <EuiSpacer size="s" />
          <EuiButtonEmpty
            size="xs"
            flush="left"
            iconType={isExpanded ? 'arrowUp' : 'arrowRight'}
            onClick={handleOpenDetailsClick}
            data-test-subj="investigationOutputOpenDetailsButton"
          >
            <FormattedMessage
              id="xpack.investigationOutput.openDetailsButtonLabel"
              defaultMessage="Open investigation"
            />
          </EuiButtonEmpty>
        </>
      )}

      {!onOpenDetails && isExpanded && (
        <>
          <EuiSpacer size="m" />
          <EuiDescriptionList
            data-test-subj="investigationOutputDetails"
            compressed
            listItems={[
              ...(state?.conclusion
                ? [
                    {
                      title: i18n.translate('xpack.investigationOutput.conclusionTitle', {
                        defaultMessage: 'Conclusion',
                      }),
                      description: state.conclusion,
                    },
                  ]
                : []),
              ...(state?.gaps_found && state.gaps_found.length > 0
                ? [
                    {
                      title: i18n.translate('xpack.investigationOutput.gapsFoundTitle', {
                        defaultMessage: 'Gaps found',
                      }),
                      description: (
                        <ul>
                          {state.gaps_found.map((gap, index) => (
                            <li key={index}>{gap}</li>
                          ))}
                        </ul>
                      ),
                    },
                  ]
                : []),
            ]}
          />
        </>
      )}
    </EuiPanel>
  );
};
