/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiMarkdownFormat,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { InvestigationOutputProps } from './types';
import { HypothesesSummary } from './hypotheses_summary';
import { HypothesisRow } from './hypothesis_row';
import { InvestigationTree } from './investigation_tree';
import { NextSteps } from './next_steps';
import { buildHeader, buildFinalResultsMarkdown } from './utils';

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
  getReferenceHref,
  mitigationRuns,
  onRunMitigation,
  getExecutionHref,
}) => {
  const hypotheses = state?.hypotheses ?? [];
  const tree = state?.tree ?? [];
  // Like the conclusion, next steps are only actionable once the investigation has finished.
  const nextSteps = status === 'complete' ? state?.next_steps ?? [] : [];
  /**
   * When the agent reported an investigation trail, that tree IS the story — hypotheses appear
   * in it as nodes with their evidence nested underneath, so the flat hypothesis list would be
   * redundant. The list remains the fallback for investigations without a trail (older runs,
   * or agents that don't report one).
   */
  const hasTree = tree.length > 0;
  const referenceCount = tree.reduce((sum, node) => sum + (node.references?.length ?? 0), 0);
  /**
   * The trail starts open while the investigation runs (following it live is the point) and
   * collapsed once it's over — the header, scoreboard and conclusion carry the outcome, and
   * the full trail is one click away for readers who want to retrace the reasoning.
   */
  const [isTrailOpen, setIsTrailOpen] = useState(status === 'running');
  const trailAccordionId = useGeneratedHtmlId({ prefix: 'investigationTrail' });
  /**
   * Only shown once the investigation has actually finished — a mid-run `conclusion` is
   * still a draft (and occasionally arrives with markdown mangled by the model over-escaping
   * newlines in its tool-call JSON), so it's never rendered before `status` is `complete`.
   */
  const finalResultsMarkdown =
    status === 'complete' && state ? buildFinalResultsMarkdown(state) : undefined;
  const header = buildHeader(status, state);
  const { euiTheme } = useEuiTheme();

  return (
    <EuiPanel hasBorder paddingSize="none" data-test-subj="investigationOutput">
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
            padding: 0 ${euiTheme.size.base} ${euiTheme.size.base};
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

      {hasTree ? (
        <div
          css={css`
            padding: 0 ${euiTheme.size.base} ${euiTheme.size.base};
          `}
          data-test-subj="investigationOutputTree"
        >
          <HypothesesSummary hypotheses={hypotheses} />
          {hypotheses.length > 0 && <EuiSpacer size="m" />}
          <EuiAccordion
            id={trailAccordionId}
            forceState={isTrailOpen ? 'open' : 'closed'}
            onToggle={setIsTrailOpen}
            data-test-subj="investigationOutputTrailAccordion"
            buttonContent={
              <EuiFlexGroup gutterSize="s" alignItems="baseline" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiTitle size="xxs">
                    <h4>
                      {i18n.translate('xpack.investigationOutput.investigationTrailTitle', {
                        defaultMessage: 'Investigation trail',
                      })}
                    </h4>
                  </EuiTitle>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">
                    {i18n.translate('xpack.investigationOutput.investigationTrailSummary', {
                      defaultMessage:
                        '{stepCount, plural, one {# step} other {# steps}} · {referenceCount, plural, one {# reference} other {# references}}',
                      values: { stepCount: tree.length, referenceCount },
                    })}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            }
          >
            <EuiSpacer size="m" />
            <InvestigationTree
              nodes={tree}
              hypotheses={hypotheses}
              getReferenceHref={getReferenceHref}
            />
          </EuiAccordion>
        </div>
      ) : hypotheses.length === 0 ? (
        <EuiText
          size="s"
          color="subdued"
          data-test-subj="investigationOutputNoHypotheses"
          css={css`
            padding: 0 ${euiTheme.size.base} ${euiTheme.size.base};
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

      {nextSteps.length > 0 && (
        <div
          css={css`
            padding: ${euiTheme.size.base};
          `}
        >
          <NextSteps
            steps={nextSteps}
            mitigationRuns={mitigationRuns}
            onRunMitigation={onRunMitigation}
            getExecutionHref={getExecutionHref}
          />
        </div>
      )}
    </EuiPanel>
  );
};
