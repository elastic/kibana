/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiMarkdownFormat,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type {
  InvestigationBlindSpot,
  InvestigationRecommendation,
  InvestigationState,
} from '@kbn/significant-events-schema';

const AgentText: React.FC<{ text: string; bold?: boolean; subdued?: boolean }> = ({
  text,
  bold = false,
  subdued = false,
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiText
      size="s"
      css={
        bold &&
        css`
          font-weight: ${euiTheme.font.weight.bold};
        `
      }
    >
      <EuiMarkdownFormat textSize="s" color={subdued ? 'subdued' : undefined}>
        {text}
      </EuiMarkdownFormat>
    </EuiText>
  );
};

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <EuiTitle size="s">
    <h4>{children}</h4>
  </EuiTitle>
);

const RecommendationRow: React.FC<{ recommendation: InvestigationRecommendation }> = ({
  recommendation: { title, description, code },
}) => (
  <EuiFlexItem grow={false}>
    <AgentText text={title} bold />
    {description && (
      <>
        <EuiSpacer size="xs" />
        <AgentText text={description} subdued />
      </>
    )}
    {code && (
      <>
        <EuiSpacer size="xs" />
        <EuiCodeBlock language="shell" fontSize="s" paddingSize="s" isCopyable>
          {code}
        </EuiCodeBlock>
      </>
    )}
  </EuiFlexItem>
);

const BlindSpotRow: React.FC<{ blindSpot: InvestigationBlindSpot }> = ({
  blindSpot: { title, description },
}) => (
  <EuiFlexItem grow={false}>
    <AgentText text={title} bold />
    {/* Recovered legacy gaps carry the same sentence as both title and description. */}
    {description !== title && (
      <>
        <EuiSpacer size="xs" />
        <AgentText text={description} subdued />
      </>
    )}
  </EuiFlexItem>
);

/**
 * The agent's own prose `conclusion`, followed by its `recommendations` and `blind_spots` as
 * sections. Renders `null` when the investigation reported none of the three. The caller decides
 * when to show it — a mid-run conclusion is still a draft.
 */
export const FinalResults: React.FC<{ state: InvestigationState }> = ({ state }) => {
  const { euiTheme } = useEuiTheme();
  const { conclusion, recommendations, blind_spots: blindSpots } = state;

  if (!conclusion && !recommendations?.length && !blindSpots?.length) {
    return null;
  }

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="l"
      data-test-subj="investigationOutputFinalResults"
      css={css`
        padding: ${euiTheme.size.l} ${euiTheme.size.base} ${euiTheme.size.base};
      `}
    >
      {conclusion && (
        <EuiFlexItem grow={false}>
          <EuiMarkdownFormat textSize="s">{conclusion}</EuiMarkdownFormat>
        </EuiFlexItem>
      )}

      {recommendations && recommendations.length > 0 && (
        <EuiFlexItem grow={false}>
          <SectionTitle>
            {i18n.translate('xpack.investigationOutput.nextStepsTitle', {
              defaultMessage: 'Next steps',
            })}
          </SectionTitle>
          <EuiSpacer size="s" />
          <EuiFlexGroup
            direction="column"
            gutterSize="m"
            data-test-subj="investigationOutputRecommendations"
          >
            {recommendations.map((recommendation, index) => (
              <RecommendationRow
                key={`${recommendation.title}-${index}`}
                recommendation={recommendation}
              />
            ))}
          </EuiFlexGroup>
        </EuiFlexItem>
      )}

      {blindSpots && blindSpots.length > 0 && (
        <EuiFlexItem grow={false}>
          <SectionTitle>
            {i18n.translate('xpack.investigationOutput.blindSpotsTitle', {
              defaultMessage: 'Blind spots',
            })}
          </SectionTitle>
          <EuiSpacer size="s" />
          <EuiFlexGroup
            direction="column"
            gutterSize="m"
            data-test-subj="investigationOutputBlindSpots"
          >
            {blindSpots.map((blindSpot, index) => (
              <BlindSpotRow key={`${blindSpot.title}-${index}`} blindSpot={blindSpot} />
            ))}
          </EuiFlexGroup>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
