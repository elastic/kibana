/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiHealth,
  EuiSpacer,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { KnowledgeIndicator } from '@kbn/streams-ai';
import { upperFirst } from 'lodash';
import React from 'react';
import { getConfidenceColor } from '../../stream_detail_systems/stream_features/use_stream_features_table';
import { FlyoutMetadataCard } from '../../../flyout_components/flyout_metadata_card';
import { FlyoutToolbarHeader } from '../../../flyout_components/flyout_toolbar_header';
import { SeverityBadge } from '../severity_badge/severity_badge';
import { KnowledgeIndicatorFeatureDetailsContent } from './knowledge_indicator_feature_details_content';
import { KnowledgeIndicatorQueryDetailsContent } from './knowledge_indicator_query_details_content';

interface Props {
  knowledgeIndicator: KnowledgeIndicator;
  occurrencesByQueryId: Record<string, Array<{ x: number; y: number }>>;
  onClose: () => void;
}

export function KnowledgeIndicatorDetailsFlyout({
  knowledgeIndicator,
  occurrencesByQueryId,
  onClose,
}: Props) {
  const flyoutTitleId = useGeneratedHtmlId({ prefix: 'knowledgeIndicatorDetailsFlyoutTitle' });

  const title =
    knowledgeIndicator.kind === 'feature'
      ? knowledgeIndicator.feature.title ?? knowledgeIndicator.feature.id
      : knowledgeIndicator.query.title ?? knowledgeIndicator.query.id;

  const streamName =
    knowledgeIndicator.kind === 'feature'
      ? knowledgeIndicator.feature.stream_name
      : knowledgeIndicator.stream_name;

  return (
    <EuiFlyout
      onClose={onClose}
      aria-labelledby={flyoutTitleId}
      type="push"
      ownFocus={false}
      size="40%"
      hideCloseButton
    >
      {/* First header: minimal toolbar with close button */}
      <FlyoutToolbarHeader>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon iconType="cross" aria-label={CLOSE_BUTTON_ARIA_LABEL} onClick={onClose} />
        </EuiFlexItem>
      </FlyoutToolbarHeader>

      {/* Second header: title and metadata cards */}
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id={flyoutTitleId}>{title}</h2>
        </EuiTitle>
        <EuiSpacer size="m" />
        <EuiFlexGroup gutterSize="s" responsive={false} wrap>
          {knowledgeIndicator.kind === 'feature' ? (
            <>
              <EuiFlexItem>
                <FlyoutMetadataCard title={CONFIDENCE_LABEL}>
                  <EuiHealth color={getConfidenceColor(knowledgeIndicator.feature.confidence)}>
                    {knowledgeIndicator.feature.confidence}
                  </EuiHealth>
                </FlyoutMetadataCard>
              </EuiFlexItem>
              <EuiFlexItem>
                <FlyoutMetadataCard title={TYPE_LABEL}>
                  <EuiBadge color="hollow">{upperFirst(knowledgeIndicator.feature.type)}</EuiBadge>
                </FlyoutMetadataCard>
              </EuiFlexItem>
            </>
          ) : (
            <>
              <EuiFlexItem>
                <FlyoutMetadataCard title={SEVERITY_LABEL}>
                  <SeverityBadge score={knowledgeIndicator.query.severity_score} />
                </FlyoutMetadataCard>
              </EuiFlexItem>
              <EuiFlexItem>
                <FlyoutMetadataCard title={TYPE_LABEL}>
                  <EuiBadge color="hollow">{QUERY_TYPE_LABEL}</EuiBadge>
                </FlyoutMetadataCard>
              </EuiFlexItem>
            </>
          )}
          <EuiFlexItem>
            <FlyoutMetadataCard title={STREAM_LABEL}>
              <EuiBadge color="hollow" iconType="productStreamsClassic" iconSide="left">
                {streamName}
              </EuiBadge>
            </FlyoutMetadataCard>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {knowledgeIndicator.kind === 'feature' ? (
          <KnowledgeIndicatorFeatureDetailsContent feature={knowledgeIndicator.feature} />
        ) : (
          <KnowledgeIndicatorQueryDetailsContent
            query={knowledgeIndicator.query}
            occurrences={occurrencesByQueryId[knowledgeIndicator.query.id]}
          />
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
}

const CLOSE_BUTTON_ARIA_LABEL = i18n.translate(
  'xpack.streams.knowledgeIndicatorDetailsFlyout.closeButtonAriaLabel',
  {
    defaultMessage: 'Close',
  }
);

const CONFIDENCE_LABEL = i18n.translate(
  'xpack.streams.knowledgeIndicatorDetailsFlyout.confidenceLabel',
  { defaultMessage: 'Confidence' }
);

const TYPE_LABEL = i18n.translate('xpack.streams.knowledgeIndicatorDetailsFlyout.typeLabel', {
  defaultMessage: 'Type',
});

const STREAM_LABEL = i18n.translate('xpack.streams.knowledgeIndicatorDetailsFlyout.streamLabel', {
  defaultMessage: 'Stream',
});

const SEVERITY_LABEL = i18n.translate(
  'xpack.streams.knowledgeIndicatorDetailsFlyout.severityLabel',
  { defaultMessage: 'Severity' }
);

const QUERY_TYPE_LABEL = i18n.translate(
  'xpack.streams.knowledgeIndicatorDetailsFlyout.queryTypeLabel',
  { defaultMessage: 'Query' }
);
