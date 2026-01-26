/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiAccordion, EuiBadge, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import type { Feature, Streams } from '@kbn/streams-schema';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { StreamFeaturesTable } from './stream_features_table';

const getUnderlineOnHoverStyle = (textDecorationValue: 'underline' | 'none') => css`
  &:hover,
  &:focus {
    text-decoration: ${textDecorationValue};
  }
`;

interface StreamFeaturesAccordionProps {
  definition: Streams.all.Definition;
  features: Feature[];
  isLoadingFeatures: boolean;
  refreshFeatures: () => void;
  isIdentifyingFeatures: boolean;
  selectedFeature: Feature | null;
  onSelectFeature: (feature: Feature | null) => void;
}

export const StreamFeaturesAccordion = ({
  definition,
  features,
  isLoadingFeatures,
  refreshFeatures,
  isIdentifyingFeatures,
  selectedFeature,
  onSelectFeature,
}: StreamFeaturesAccordionProps) => {
  return (
    <EuiAccordion
      initialIsOpen={true}
      id="stream-features-accordion"
      buttonContent={
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false} css={getUnderlineOnHoverStyle('underline')}>
            {i18n.translate('xpack.streams.streamFeaturesAccordion.buttonLabel', {
              defaultMessage: 'Stream features',
            })}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">
              {isIdentifyingFeatures ? 'Identifying...' : features.length}
            </EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      buttonProps={{ css: getUnderlineOnHoverStyle('none') }}
    >
      <EuiSpacer size="s" />
      <StreamFeaturesTable
        definition={definition}
        isLoadingFeatures={isLoadingFeatures}
        features={features}
        refreshFeatures={refreshFeatures}
        isIdentifyingFeatures={isIdentifyingFeatures}
        selectedFeature={selectedFeature}
        onSelectFeature={onSelectFeature}
      />
    </EuiAccordion>
  );
};
