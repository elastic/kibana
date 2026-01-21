/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiAccordion, EuiBadge, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import type { Streams, System } from '@kbn/streams-schema';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { StreamExistingFeaturesTable } from './stream_existing_features_table';
import type { AIFeatures } from '../../../hooks/use_ai_features';

const getUnderlineOnHoverStyle = (textDecorationValue: 'underline' | 'none') => css`
  &:hover,
  &:focus {
    text-decoration: ${textDecorationValue};
  }
`;

export const StreamFeaturesAccordion = ({
  definition,
  features,
  loading,
  refresh,
  aiFeatures,
}: {
  definition: Streams.all.Definition;
  features: System[];
  loading: boolean;
  refresh: () => void;
  aiFeatures: AIFeatures | null;
}) => {
  return (
    <EuiAccordion
      initialIsOpen={true}
      id="stream-features-accordion"
      buttonContent={
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false} css={getUnderlineOnHoverStyle('underline')}>
            {i18n.translate('xpack.streams.streamFeaturesAccordion.buttonLabel', {
              defaultMessage: 'Features',
            })}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">{features.length}</EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      buttonProps={{ css: getUnderlineOnHoverStyle('none') }}
    >
      <EuiSpacer size="s" />
      <StreamExistingFeaturesTable
        isLoading={loading}
        features={features}
        definition={definition}
        refreshFeatures={refresh}
        aiFeatures={aiFeatures}
      />
    </EuiAccordion>
  );
};
