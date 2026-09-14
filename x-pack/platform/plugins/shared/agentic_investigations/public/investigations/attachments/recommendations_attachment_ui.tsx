/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  AttachmentUIDefinition,
  ConversationDetailsRenderProps,
} from '@kbn/agent-builder-browser';

/** Data shape of one recommendation inside the recommendations attachment. */
interface InvestigationRecommendation {
  title: string;
  confidence: number;
  description?: string;
  code?: string;
}

/** Data shape of the investigations.recommendations attachment. */
interface RecommendationsAttachmentData {
  recommendations: InvestigationRecommendation[];
}

interface RecommendationsAttachment {
  id: string;
  type: string;
  data: RecommendationsAttachmentData;
}

const renderInlineContent = ({ attachment }: { attachment: RecommendationsAttachment }) => {
  const recommendations: InvestigationRecommendation[] = attachment.data?.recommendations ?? [];

  return (
    <EuiText size="s">
      {i18n.translate('xpack.agenticInvestigations.attachments.recommendations.summary', {
        defaultMessage: '{count} {count, plural, one {recommendation} other {recommendations}}',
        values: { count: recommendations.length },
      })}
    </EuiText>
  );
};

const RecommendationItem = ({
  recommendation,
}: {
  recommendation: InvestigationRecommendation;
}) => {
  const { euiTheme } = useEuiTheme();
  const confidencePct = Math.round(recommendation.confidence * 100);

  return (
    <EuiFlexGroup direction="column" gutterSize="xs">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow>
            <EuiText size="s">
              <strong>{recommendation.title}</strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {i18n.translate(
                'xpack.agenticInvestigations.attachments.recommendations.confidence',
                {
                  defaultMessage: '{pct}% confidence',
                  values: { pct: confidencePct },
                }
              )}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      {recommendation.description && (
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            <p>{recommendation.description}</p>
          </EuiText>
        </EuiFlexItem>
      )}
      {recommendation.code && (
        <EuiFlexItem grow={false}>
          <EuiCode
            css={css`
              display: block;
              white-space: pre-wrap;
              word-break: break-all;
              padding: ${euiTheme.size.s};
            `}
          >
            {recommendation.code}
          </EuiCode>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

const renderConversationDetailsContent = ({
  attachment,
}: ConversationDetailsRenderProps<RecommendationsAttachment>) => {
  const recommendations: InvestigationRecommendation[] = attachment.data?.recommendations ?? [];

  if (!recommendations.length) {
    return (
      <EuiText size="s" color="subdued">
        {i18n.translate(
          'xpack.agenticInvestigations.attachments.recommendations.noRecommendations',
          { defaultMessage: 'No recommendations recorded.' }
        )}
      </EuiText>
    );
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem grow={false}>
        <EuiTitle size="xs">
          <h3>
            {i18n.translate(
              'xpack.agenticInvestigations.attachments.recommendations.detailsTitle',
              { defaultMessage: 'Recommendations' }
            )}
          </h3>
        </EuiTitle>
      </EuiFlexItem>
      {recommendations.map((recommendation, idx) => (
        <React.Fragment key={idx}>
          <EuiFlexItem grow={false}>
            <RecommendationItem recommendation={recommendation} />
          </EuiFlexItem>
          {idx < recommendations.length - 1 && (
            <EuiFlexItem grow={false}>
              <EuiSpacer size="s" />
            </EuiFlexItem>
          )}
        </React.Fragment>
      ))}
    </EuiFlexGroup>
  );
};

export const recommendationsAttachmentUIDefinition: AttachmentUIDefinition<RecommendationsAttachment> =
  {
    getLabel: () =>
      i18n.translate('xpack.agenticInvestigations.attachments.recommendations.label', {
        defaultMessage: 'Recommendations',
      }),
    getIcon: () => 'bullseye',
    renderInlineContent,
    renderConversationDetailsContent,
  };
