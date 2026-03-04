/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiAccordion, EuiBadge, EuiSpacer, EuiTabs, EuiTab } from '@elastic/eui';
import type { Feature, Streams } from '@kbn/streams-schema';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { StreamFeaturesTable } from './stream_features_table';
import { DeletedFeaturesTable } from './deleted_features_table';

const getUnderlineOnHoverStyle = (textDecoration: 'underline' | 'none') => css`
  &:hover,
  &:focus {
    text-decoration: ${textDecoration};
  }
`;

const noUnderlineOnHoverStyle = getUnderlineOnHoverStyle('none');

type FeaturesTab = 'active' | 'deleted';

interface StreamFeaturesAccordionProps {
  definition: Streams.all.Definition;
  features: Feature[];
  deletedFeatures: Feature[];
  isLoadingFeatures: boolean;
  refreshFeatures: () => void;
  isIdentifyingFeatures: boolean;
  selectedFeature: Feature | null;
  onSelectFeature: (feature: Feature | null) => void;
}

export const StreamFeaturesAccordion = ({
  definition,
  features,
  deletedFeatures,
  isLoadingFeatures,
  refreshFeatures,
  isIdentifyingFeatures,
  selectedFeature,
  onSelectFeature,
}: StreamFeaturesAccordionProps) => {
  const [activeTab, setActiveTab] = useState<FeaturesTab>('active');

  const handleTabChange = useCallback(
    (tab: FeaturesTab) => {
      setActiveTab(tab);
      onSelectFeature(null);
    },
    [onSelectFeature]
  );

  const tabs: { id: FeaturesTab; label: string; count: number }[] = useMemo(
    () => [
      { id: 'active', label: ACTIVE_TAB_LABEL, count: features.length },
      { id: 'deleted', label: DELETED_TAB_LABEL, count: deletedFeatures.length },
    ],
    [features.length, deletedFeatures.length]
  );

  return (
    <EuiAccordion
      initialIsOpen={true}
      id="stream-features-accordion"
      buttonContent={BUTTON_LABEL}
      buttonProps={{ css: noUnderlineOnHoverStyle }}
    >
      <EuiSpacer size="s" />
      <EuiTabs size="s" bottomBorder={false}>
        {tabs.map(({ id, label, count }) => (
          <EuiTab
            key={id}
            isSelected={activeTab === id}
            onClick={() => handleTabChange(id)}
            append={count > 0 ? <EuiBadge color="hollow">{count}</EuiBadge> : undefined}
          >
            {label}
          </EuiTab>
        ))}
      </EuiTabs>
      <EuiSpacer size="s" />
      {activeTab === 'active' ? (
        <StreamFeaturesTable
          definition={definition}
          isLoadingFeatures={isLoadingFeatures}
          features={features}
          refreshFeatures={refreshFeatures}
          isIdentifyingFeatures={isIdentifyingFeatures}
          selectedFeature={selectedFeature}
          onSelectFeature={onSelectFeature}
        />
      ) : (
        <DeletedFeaturesTable
          definition={definition}
          isLoadingFeatures={isLoadingFeatures}
          deletedFeatures={deletedFeatures}
          refreshFeatures={refreshFeatures}
          isIdentifyingFeatures={isIdentifyingFeatures}
          selectedFeature={selectedFeature}
          onSelectFeature={onSelectFeature}
        />
      )}
    </EuiAccordion>
  );
};

const BUTTON_LABEL = i18n.translate('xpack.streams.streamFeaturesAccordion.buttonLabel', {
  defaultMessage: 'Stream features',
});

const ACTIVE_TAB_LABEL = i18n.translate('xpack.streams.streamFeaturesAccordion.activeTabLabel', {
  defaultMessage: 'Active',
});

const DELETED_TAB_LABEL = i18n.translate('xpack.streams.streamFeaturesAccordion.deletedTabLabel', {
  defaultMessage: 'Deleted',
});
