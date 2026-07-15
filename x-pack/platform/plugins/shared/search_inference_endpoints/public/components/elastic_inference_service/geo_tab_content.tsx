/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiCallOut, EuiEmptyPrompt, EuiFlexGroup, EuiLoadingSpinner } from '@elastic/eui';
import type { UseEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { RegionSelectionToolbar } from './region_selection_toolbar';
import { GeoZoneList } from './geo_zone_list';

const tabContentStyles = ({ euiTheme }: UseEuiTheme) => css`
  margin-top: ${euiTheme.size.m};
`;

export interface GeoTabState {
  totalGeos: number;
  totalGeosSelected: number;
  allGeosSelected: boolean;
  availableGeos: string[];
  checkedGeos: Set<string>;
  onSelectAll: () => void;
  onToggleGeo: (geo: string) => void;
}

export interface GeoTabContentProps {
  isLoading: boolean;
  isError: boolean;
  geoTab: GeoTabState;
}

export const GeoTabContent: React.FC<GeoTabContentProps> = ({
  isLoading,
  isError,
  geoTab: {
    totalGeos,
    totalGeosSelected,
    allGeosSelected,
    availableGeos,
    checkedGeos,
    onSelectAll,
    onToggleGeo,
  },
}) => {
  if (isLoading) {
    return (
      <EuiEmptyPrompt
        css={tabContentStyles}
        icon={<EuiLoadingSpinner size="xl" />}
        data-test-subj="manageGeosLoading"
      />
    );
  }

  if (totalGeos === 0) {
    if (isError) return null;
    return (
      <EuiCallOut
        css={tabContentStyles}
        announceOnMount
        title={i18n.translate('xpack.searchInferenceEndpoints.manageRegions.noGeos.title', {
          defaultMessage: 'No geographies available',
        })}
        color="warning"
        iconType="warning"
        data-test-subj="manageRegionsNoGeos"
      >
        <p>
          {i18n.translate('xpack.searchInferenceEndpoints.manageRegions.noGeos.description', {
            defaultMessage:
              'No geographic zone information is available for the current Elastic Inference Service endpoints.',
          })}
        </p>
      </EuiCallOut>
    );
  }

  return (
    <EuiFlexGroup css={tabContentStyles} direction="column" gutterSize="s">
      <RegionSelectionToolbar
        totalSelected={totalGeosSelected}
        totalRegions={totalGeos}
        allSelected={allGeosSelected}
        onSelectAll={onSelectAll}
      />
      <GeoZoneList
        availableGeos={availableGeos}
        checkedGeos={checkedGeos}
        onToggleGeo={onToggleGeo}
      />
    </EuiFlexGroup>
  );
};
