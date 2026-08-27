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

const LOCATION_TYPE_OPTIONS = [
  {
    id: 'geo' as const,
    label: i18n.translate('xpack.searchInferenceEndpoints.manageRegions.locationTypeGeoLabel', {
      defaultMessage: 'Geographies',
    }),
    'data-test-subj': 'manageRegionsLocationTypeGeo',
  },
  {
    id: 'regions' as const,
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
  const { label, hint } =
    activeTab === 'geo'
      ? {
          label: i18n.translate(
            'xpack.searchInferenceEndpoints.manageRegions.locationTypeLabel.geo',
            { defaultMessage: 'Choose location type:' }
          ),
          hint: i18n.translate(
            'xpack.searchInferenceEndpoints.manageRegions.locationTypeHint.geo',
            { defaultMessage: 'Switching location type will clear the current selection.' }
          ),
        }
      : {
          label: i18n.translate(
            'xpack.searchInferenceEndpoints.manageRegions.locationTypeLabel.regions',
            { defaultMessage: 'Choose locations:' }
          ),
          hint: i18n.translate(
            'xpack.searchInferenceEndpoints.manageRegions.locationTypeHint.regions',
            { defaultMessage: 'All regions within the zone will be allowed.' }
          ),
        };

  return (
    <EuiFlexGroup direction="column" gutterSize="xs">
      <EuiFlexItem grow={false}>
        <EuiText size="xs">
          <strong>{label}</strong>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
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
            <EuiText size="xs" color="subdued" data-test-subj="manageRegionsLocationTypeHint">
              {hint}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
