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
import { RegionZoneList } from './region_zone_list';
import type { ZoneGroup } from '../../utils/eis_utils';

const tabContentStyles = ({ euiTheme }: UseEuiTheme) => css`
  margin-top: ${euiTheme.size.m};
`;

export interface RegionTabState {
  totalRegions: number;
  totalSelected: number;
  allSelected: boolean;
  isAllExpanded: boolean;
  zoneGroups: ZoneGroup[];
  checkedKeys: Set<string>;
  expandedZones: Set<string>;
  onSelectAll: () => void;
  onExpandAll: () => void;
  onToggleRegion: (key: string) => void;
  onToggleExpand: (zoneId: string, isOpen: boolean) => void;
}

export interface RegionsTabContentProps {
  isLoading: boolean;
  isError: boolean;
  regionTab: RegionTabState;
}

export const RegionsTabContent: React.FC<RegionsTabContentProps> = ({
  isLoading,
  isError,
  regionTab: {
    totalRegions,
    totalSelected,
    allSelected,
    isAllExpanded,
    zoneGroups,
    checkedKeys,
    expandedZones,
    onSelectAll,
    onExpandAll,
    onToggleRegion,
    onToggleExpand,
  },
}) => {
  if (isLoading) {
    return (
      <EuiEmptyPrompt
        css={tabContentStyles}
        icon={<EuiLoadingSpinner size="xl" />}
        data-test-subj="manageRegionsLoading"
      />
    );
  }

  if (totalRegions === 0) {
    if (isError) return null;
    return (
      <EuiCallOut
        css={tabContentStyles}
        announceOnMount
        title={i18n.translate('xpack.searchInferenceEndpoints.manageRegions.noRegions.title', {
          defaultMessage: 'No regions available',
        })}
        color="warning"
        iconType="warning"
        data-test-subj="manageRegionsNoRegions"
      >
        <p>
          {i18n.translate('xpack.searchInferenceEndpoints.manageRegions.noRegions.description', {
            defaultMessage:
              'No region information is available for the current Elastic Inference Service endpoints.',
          })}
        </p>
      </EuiCallOut>
    );
  }

  return (
    <EuiFlexGroup css={tabContentStyles} direction="column" gutterSize="s">
      <RegionSelectionToolbar
        totalSelected={totalSelected}
        totalRegions={totalRegions}
        allSelected={allSelected}
        isAllExpanded={isAllExpanded}
        onSelectAll={onSelectAll}
        onExpandAll={onExpandAll}
      />
      <RegionZoneList
        zoneGroups={zoneGroups}
        checkedKeys={checkedKeys}
        expandedZones={expandedZones}
        onToggleRegion={onToggleRegion}
        onToggleExpand={onToggleExpand}
      />
    </EuiFlexGroup>
  );
};
