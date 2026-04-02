/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { KnowledgeIndicator } from '@kbn/streams-ai';
import React from 'react';
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

  return (
    <EuiFlyout
      onClose={onClose}
      aria-labelledby={flyoutTitleId}
      type="push"
      ownFocus={false}
      size="40%"
      hideCloseButton
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
          <EuiFlexItem>
            <EuiTitle size="m">
              <h2 id={flyoutTitleId}>{title}</h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType="cross"
              aria-label={CLOSE_BUTTON_ARIA_LABEL}
              onClick={onClose}
            />
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
