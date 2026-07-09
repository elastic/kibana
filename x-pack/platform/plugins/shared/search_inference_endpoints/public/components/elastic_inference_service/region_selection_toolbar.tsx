/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface RegionSelectionToolbarProps {
  totalSelected: number;
  totalRegions: number;
  allSelected: boolean;
  isAllExpanded: boolean;
  onSelectAll: () => void;
  onExpandAll: () => void;
}

export const RegionSelectionToolbar: React.FC<RegionSelectionToolbarProps> = ({
  totalSelected,
  totalRegions,
  allSelected,
  isAllExpanded,
  onSelectAll,
  onExpandAll,
}) => (
  <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="s" responsive={false}>
    <EuiFlexItem grow={false}>
      <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <strong>
              {i18n.translate('xpack.searchInferenceEndpoints.manageRegions.selectionCount', {
                defaultMessage: '{selected} of {total} selected',
                values: { selected: totalSelected, total: totalRegions },
              })}
            </strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="xs"
            flush="left"
            onClick={onSelectAll}
            data-test-subj="manageRegionsSelectAllButton"
          >
            {allSelected
              ? i18n.translate('xpack.searchInferenceEndpoints.manageRegions.deselectAll', {
                  defaultMessage: 'Deselect all',
                })
              : i18n.translate('xpack.searchInferenceEndpoints.manageRegions.selectAll', {
                  defaultMessage: 'Select all',
                })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>

    <EuiFlexItem grow={false}>
      <EuiButtonEmpty size="xs" onClick={onExpandAll} data-test-subj="manageRegionsExpandAllButton">
        {isAllExpanded
          ? i18n.translate('xpack.searchInferenceEndpoints.manageRegions.collapseAll', {
              defaultMessage: 'Collapse all',
            })
          : i18n.translate('xpack.searchInferenceEndpoints.manageRegions.expandAll', {
              defaultMessage: 'Expand all',
            })}
      </EuiButtonEmpty>
    </EuiFlexItem>
  </EuiFlexGroup>
);
