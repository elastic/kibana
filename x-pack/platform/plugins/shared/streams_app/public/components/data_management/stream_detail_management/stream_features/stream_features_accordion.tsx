/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiAccordion, EuiBadge, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import type { Streams, Feature } from '@kbn/streams-schema';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { StreamExistingFeaturesTable } from './stream_existing_features_table';

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
}: {
  definition: Streams.all.Definition;
  features: Feature[];
  loading: boolean;
  refresh: () => void;
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
      />
    </EuiAccordion>
  );
};
