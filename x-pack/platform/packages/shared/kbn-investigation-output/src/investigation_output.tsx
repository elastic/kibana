/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
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
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { InvestigationOutputProps } from './types';
import { HypothesisRow } from './hypothesis_row';
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
}) => {
  const hypotheses = state?.hypotheses ?? [];
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

      {hypotheses.length === 0 ? (
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
    </EuiPanel>
  );
};
