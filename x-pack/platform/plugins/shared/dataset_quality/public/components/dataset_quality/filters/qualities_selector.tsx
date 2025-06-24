/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFilterButton, EuiPopover, EuiSelectable, EuiText } from '@elastic/eui';
import React, { useState } from 'react';
import type { EuiSelectableOptionCheckedType } from '@elastic/eui/src/components/selectable/selectable_option';
import { i18n } from '@kbn/i18n';
import { capitalize } from 'lodash';
import { QualityIndicators } from '../../../../common/types';
import { QualityIndicator } from '../../quality_indicator';

const qualitiesSelectorLabel = i18n.translate('xpack.datasetQuality.qualitiesSelectorLabel', {
  defaultMessage: 'Qualities',
});

const qualitiesSelectorLoading = i18n.translate('xpack.datasetQuality.qualitiesSelectorLoading', {
  defaultMessage: 'Loading qualities',
});

const qualitiesSelectorNoneAvailable = i18n.translate(
  'xpack.datasetQuality.qualitiesSelectorNoneAvailable',
  {
    defaultMessage: 'No qualities available',
  }
);

const qualitiesSelectorNoneMatching = i18n.translate(
  'xpack.datasetQuality.qualitiesSelectorNoneMatching',
  {
    defaultMessage: 'No qualities found',
  }
);

interface QualitiesSelectorProps {
  isLoading: boolean;
  qualities: QualityItem[];
  onQualitiesChange: (qualities: QualityItem[]) => void;
}

export interface QualityItem {
  label: QualityIndicators;
  checked?: EuiSelectableOptionCheckedType;
}

export function QualitiesSelector({
  isLoading,
  qualities,
  onQualitiesChange,
}: QualitiesSelectorProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const onButtonClick = () => {
    setIsPopoverOpen(!isPopoverOpen);
  };

  const closePopover = () => {
    setIsPopoverOpen(false);
  };

  const renderOption = (quality: QualityItem) => (
    <EuiText size="s">
      <QualityIndicator
        quality={quality.label}
        description={capitalize(quality.label)}
        isColoredDescription
      />
    </EuiText>
  );

  const button = (
    <EuiFilterButton
      data-test-subj="datasetQualityQualitiesSelectableButton"
      iconType="arrowDown"
      badgeColor="success"
      onClick={onButtonClick}
      isSelected={isPopoverOpen}
      numFilters={qualities.length}
      hasActiveFilters={!!qualities.find((item) => item.checked === 'on')}
      numActiveFilters={qualities.filter((item) => item.checked === 'on').length}
    >
      {qualitiesSelectorLabel}
    </EuiFilterButton>
  );

  return (
    <EuiPopover
      button={button}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
    >
      <EuiSelectable
        data-test-subj="datasetQualityQualitiesSelectable"
        aria-label={qualitiesSelectorLabel}
        options={qualities}
        onChange={onQualitiesChange}
        isLoading={isLoading}
        loadingMessage={qualitiesSelectorLoading}
        emptyMessage={qualitiesSelectorNoneAvailable}
        noMatchesMessage={qualitiesSelectorNoneMatching}
        renderOption={(option) => renderOption(option)}
      >
        {(list) => <div style={{ width: 200 }}>{list}</div>}
      </EuiSelectable>
    </EuiPopover>
  );
}
