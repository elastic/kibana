/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiAccordion,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTab,
  EuiTabs,
} from '@elastic/eui';
import type { Feature, Streams } from '@kbn/streams-schema';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { StreamFeaturesTable } from './stream_features_table';

const getUnderlineOnHoverStyle = (textDecoration: 'underline' | 'none') => css`
  &:hover,
  &:focus {
    text-decoration: ${textDecoration};
  }
`;

const underlineOnHoverStyle = getUnderlineOnHoverStyle('underline');
const noUnderlineOnHoverStyle = getUnderlineOnHoverStyle('none');

type TabId = 'active' | 'excluded';

interface StreamFeaturesAccordionProps {
  definition: Streams.all.Definition;
  features: Feature[];
  excludedFeatures: Feature[];
  isLoadingFeatures: boolean;
  refreshFeatures: () => void;
  isIdentifyingFeatures: boolean;
  selectedFeature: Feature | null;
  onSelectFeature: (feature: Feature | null) => void;
}

export const StreamFeaturesAccordion = ({
  definition,
  features,
  excludedFeatures,
  isLoadingFeatures,
  refreshFeatures,
  isIdentifyingFeatures,
  selectedFeature,
  onSelectFeature,
}: StreamFeaturesAccordionProps) => {
  const [selectedTab, setSelectedTab] = useState<TabId>('active');
  const totalCount = features.length + excludedFeatures.length;

  const handleTabChange = useCallback(
    (tab: TabId) => {
      onSelectFeature(null);
      setSelectedTab(tab);
    },
    [onSelectFeature]
  );

  return (
    <EuiAccordion
      initialIsOpen={true}
      id="stream-features-accordion"
      buttonContent={
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false} css={underlineOnHoverStyle}>
            {BUTTON_LABEL}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">{totalCount}</EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      buttonProps={{ css: noUnderlineOnHoverStyle }}
    >
      <EuiSpacer size="s" />
      <EuiTabs bottomBorder={false} size="s">
        <EuiTab
          isSelected={selectedTab === 'active'}
          onClick={() => handleTabChange('active')}
          append={<EuiBadge color="hollow">{features.length}</EuiBadge>}
        >
          {ACTIVE_TAB_LABEL}
        </EuiTab>
        <EuiTab
          isSelected={selectedTab === 'excluded'}
          onClick={() => handleTabChange('excluded')}
          append={<EuiBadge color="hollow">{excludedFeatures.length}</EuiBadge>}
        >
          {EXCLUDED_TAB_LABEL}
        </EuiTab>
      </EuiTabs>
      <StreamFeaturesTable
        definition={definition}
        isLoadingFeatures={isLoadingFeatures}
        features={selectedTab === 'active' ? features : excludedFeatures}
        refreshFeatures={refreshFeatures}
        isIdentifyingFeatures={isIdentifyingFeatures}
        selectedFeature={selectedFeature}
        onSelectFeature={onSelectFeature}
        mode={selectedTab}
      />
    </EuiAccordion>
  );
};

const BUTTON_LABEL = i18n.translate('xpack.streams.streamFeaturesAccordion.buttonLabel', {
  defaultMessage: 'Stream features',
});

const ACTIVE_TAB_LABEL = i18n.translate('xpack.streams.streamFeaturesAccordion.activeTab', {
  defaultMessage: 'Active',
});

const EXCLUDED_TAB_LABEL = i18n.translate('xpack.streams.streamFeaturesAccordion.excludedTab', {
  defaultMessage: 'Excluded',
});
