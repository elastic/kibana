/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonGroup, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isPolicyMode } from '../../utils/eis_utils';
import type { PolicyMode } from '../../types';

interface LocationTypeSelectorProps {
  activeTab: PolicyMode;
  isDisabled: boolean;
  onChange: (mode: PolicyMode) => void;
}

const LOCATION_TYPE_OPTIONS: { id: PolicyMode; label: string; 'data-test-subj': string }[] = [
  {
    id: 'geo',
    label: i18n.translate('xpack.searchInferenceEndpoints.manageRegions.locationTypeGeoLabel', {
      defaultMessage: 'Geographies',
    }),
    'data-test-subj': 'manageRegionsLocationTypeGeo',
  },
  {
    id: 'regions',
    label: i18n.translate('xpack.searchInferenceEndpoints.manageRegions.locationTypeRegionsLabel', {
      defaultMessage: 'Regions',
    }),
    'data-test-subj': 'manageRegionsLocationTypeRegions',
  },
];

export const LocationTypeSelector: React.FC<LocationTypeSelectorProps> = ({
  activeTab,
  isDisabled,
  onChange,
}) => {
  const { hint } =
    activeTab === 'geo'
      ? {
          hint: i18n.translate(
            'xpack.searchInferenceEndpoints.manageRegions.locationTypeHint.geo',
            { defaultMessage: 'Allows all current and future available regions within the zone.' }
          ),
        }
      : {
          hint: i18n.translate(
            'xpack.searchInferenceEndpoints.manageRegions.locationTypeHint.regions',
            { defaultMessage: 'Only allows the selected regions.' }
          ),
        };

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s">
      <EuiFlexItem grow={false}>
        <EuiButtonGroup
          type="single"
          legend={i18n.translate(
            'xpack.searchInferenceEndpoints.manageRegions.locationTypeLegend',
            { defaultMessage: 'Location type' }
          )}
          buttonSize="compressed"
          idSelected={activeTab}
          options={LOCATION_TYPE_OPTIONS}
          onChange={(id) => isPolicyMode(id) && onChange(id)}
          isDisabled={isDisabled}
          data-test-subj="manageRegionsLocationTypeGroup"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s" color="subdued" data-test-subj="manageRegionsLocationTypeHint">
          {hint}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
