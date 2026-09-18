/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiAccordion,
  EuiBadge,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiMarkdownFormat,
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
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

const TitleText: React.FC<{ text: string }> = ({ text }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiText
      component="span"
      size="s"
      css={css`
        font-weight: ${euiTheme.font.weight.bold};
      `}
    >
      {text}
    </EuiText>
  );
};

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <EuiTitle size="s">
    <h4>{children}</h4>
  </EuiTitle>
);

const RecommendationRow: React.FC<{
  recommendation: InvestigationRecommendation;
  isRecommended: boolean;
  isLast: boolean;
  onClick?: () => void;
}> = ({ recommendation: { title }, isRecommended, isLast, onClick }) => {
  const { euiTheme } = useEuiTheme();
  const rowCss = css`
    border-bottom: ${isLast ? 'none' : euiTheme.border.thin};
    border-radius: 0;
    text-align: left;
    width: 100%;
  `;
  const content = (
    <EuiFlexGroup component="span" alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem component="span">
        <TitleText text={title} />
      </EuiFlexItem>
      {isRecommended && (
        <EuiFlexItem component="span" grow={false}>
          <EuiBadge color="primary">
            {i18n.translate('xpack.investigationOutput.recommendedLabel', {
              defaultMessage: 'Recommended',
            })}
          </EuiBadge>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );

  if (!onClick) {
    return (
      <EuiPanel hasShadow={false} paddingSize="m" css={rowCss}>
        {content}
      </EuiPanel>
    );
  }

  return (
    <EuiPanel
      element="button"
      type="button"
      hasShadow={false}
      paddingSize="m"
      onClick={onClick}
      css={rowCss}
    >
      {content}
    </EuiPanel>
  );
};

const BlindSpotRow: React.FC<{
  blindSpot: InvestigationBlindSpot;
  isMostImpactful: boolean;
  isLast: boolean;
}> = ({ blindSpot: { title, description }, isMostImpactful, isLast }) => {
  const accordionId = useGeneratedHtmlId({ prefix: 'investigationBlindSpot' });
  const { euiTheme } = useEuiTheme();
  const hasDescription = description !== title;
  const badge = isMostImpactful ? (
    <EuiBadge color="primary">
      {i18n.translate('xpack.investigationOutput.mostImpactfulLabel', {
        defaultMessage: 'Most impactful',
      })}
    </EuiBadge>
  ) : undefined;

  const rowCss = css`
    border-bottom: ${isLast ? 'none' : euiTheme.border.thin};
    padding: ${euiTheme.size.s} ${euiTheme.size.m};
  `;

  if (!hasDescription) {
    return (
      <EuiFlexGroup
        alignItems="center"
        gutterSize="s"
        responsive={false}
        data-test-subj="investigationOutputBlindSpot"
        css={rowCss}
      >
        <EuiFlexItem>
          <TitleText text={title} />
        </EuiFlexItem>
        {badge && <EuiFlexItem grow={false}>{badge}</EuiFlexItem>}
      </EuiFlexGroup>
    );
  }

  return (
    <EuiAccordion
      id={accordionId}
      data-test-subj="investigationOutputBlindSpot"
      paddingSize="none"
      buttonContent={<TitleText text={title} />}
      extraAction={badge}
      css={rowCss}
    >
      <AgentText text={description} subdued />
    </EuiAccordion>
  );
};

/**
 * The agent's own prose `conclusion`, followed by its `recommendations` and `blind_spots` as
 * sections. Renders `null` when the investigation reported none of the three. The caller decides
 * when to show it — a mid-run conclusion is still a draft.
 */
export const FinalResults: React.FC<{ state: InvestigationState }> = ({ state }) => {
  const { conclusion, recommendations, blind_spots: blindSpots } = state;
  const [selectedRecommendation, setSelectedRecommendation] =
    useState<InvestigationRecommendation>();
  const currentRecommendation = selectedRecommendation
    ? recommendations?.find(
        ({ title, description, code }) =>
          title === selectedRecommendation.title &&
          description === selectedRecommendation.description &&
          code === selectedRecommendation.code
      )
    : undefined;
  const recommendationModalTitleId = useGeneratedHtmlId({ prefix: 'investigationRecommendation' });

  if (!conclusion && !recommendations?.length && !blindSpots?.length) {
    return null;
  }

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="l"
      data-test-subj="investigationOutputFinalResults"
    >
      {conclusion && (
        <EuiFlexItem grow={false}>
          <EuiMarkdownFormat textSize="s">{conclusion}</EuiMarkdownFormat>
        </EuiFlexItem>
      )}

      {recommendations && recommendations.length > 0 && (
        <EuiFlexItem grow={false}>
          <SectionTitle>
            {i18n.translate('xpack.investigationOutput.proposedActionsTitle', {
              defaultMessage: 'Proposed actions',
            })}
          </SectionTitle>
          <EuiSpacer size="s" />
          <EuiPanel
            hasBorder
            hasShadow={false}
            paddingSize="none"
            data-test-subj="investigationOutputRecommendations"
          >
            <EuiFlexGroup direction="column" gutterSize="none">
              {recommendations.map((recommendation, index) => (
                <RecommendationRow
                  key={`${recommendation.title}-${index}`}
                  recommendation={recommendation}
                  isRecommended={index === 0}
                  isLast={index === recommendations.length - 1}
                  onClick={
                    recommendation.description || recommendation.code
                      ? () => setSelectedRecommendation(recommendation)
                      : undefined
                  }
                />
              ))}
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
      )}

      {blindSpots && blindSpots.length > 0 && (
        <EuiFlexItem grow={false}>
          <SectionTitle>
            {i18n.translate('xpack.investigationOutput.blindSpotsTitle', {
              defaultMessage: 'Blind spots',
            })}
          </SectionTitle>
          <EuiText size="s" color="subdued">
            {i18n.translate('xpack.investigationOutput.blindSpotsCountDescription', {
              defaultMessage: '{count} identified',
              values: { count: blindSpots.length },
            })}
          </EuiText>
          <EuiSpacer size="s" />
          <EuiPanel
            hasBorder
            hasShadow={false}
            paddingSize="none"
            data-test-subj="investigationOutputBlindSpots"
          >
            {blindSpots.map((blindSpot, index) => (
              <BlindSpotRow
                key={`${blindSpot.title}-${index}`}
                blindSpot={blindSpot}
                isMostImpactful={index === 0}
                isLast={index === blindSpots.length - 1}
              />
            ))}
          </EuiPanel>
        </EuiFlexItem>
      )}

      {currentRecommendation && (
        <EuiModal
          aria-labelledby={recommendationModalTitleId}
          onClose={() => setSelectedRecommendation(undefined)}
        >
          <EuiModalHeader>
            <EuiModalHeaderTitle id={recommendationModalTitleId}>
              {currentRecommendation.title}
            </EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            {currentRecommendation.description && (
              <>
                <AgentText text={currentRecommendation.description} />
                {currentRecommendation.code && <EuiSpacer size="m" />}
              </>
            )}
            {currentRecommendation.code && (
              <EuiCodeBlock language="shell" fontSize="s" paddingSize="s" isCopyable>
                {currentRecommendation.code}
              </EuiCodeBlock>
            )}
          </EuiModalBody>
        </EuiModal>
      )}
    </EuiFlexGroup>
  );
};
