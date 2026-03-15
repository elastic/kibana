/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import type { ReactNode } from 'react';
import {
  EuiHorizontalRule,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiButtonEmpty,
  EuiPanel,
} from '@elastic/eui';
import type { EuiBasicTableColumn, CriteriaWithPagination } from '@elastic/eui';
import type { Feature } from '@kbn/streams-schema';
import { i18n } from '@kbn/i18n';
import { TableTitle } from '../table_title';
import { FeatureDetailsFlyout } from './feature_details_flyout';

interface BulkAction {
  label: string;
  iconType: string;
  color?: 'text' | 'danger';
  isLoading: boolean;
  onClick: () => void;
}

type FlyoutActions =
  | { onDelete: () => Promise<void>; isDeleting: boolean }
  | { onRestore: () => Promise<void>; isRestoring: boolean };

interface BaseFeaturesTableProps {
  titleLabel: string;
  tableCaptionLabel: string;
  isLoadingFeatures: boolean;
  isIdentifyingFeatures: boolean;
  features: Feature[];
  selectedFeature: Feature | null;
  onSelectFeature: (feature: Feature | null) => void;
  pagination: { pageIndex: number; pageSize: number };
  selectedFeatures: Feature[];
  setSelectedFeatures: (features: Feature[]) => void;
  clearSelection: () => void;
  handleTableChange: (criteria: CriteriaWithPagination<Feature>) => void;
  columns: Array<EuiBasicTableColumn<Feature>>;
  items: Feature[];
  noItemsMessage: string;
  bulkAction: BulkAction;
  flyoutActions: FlyoutActions;
  children?: ReactNode;
}

export const BaseFeaturesTable = ({
  titleLabel,
  tableCaptionLabel,
  isLoadingFeatures,
  isIdentifyingFeatures,
  features,
  selectedFeature,
  onSelectFeature,
  pagination,
  selectedFeatures,
  setSelectedFeatures,
  clearSelection,
  handleTableChange,
  columns,
  items,
  noItemsMessage,
  bulkAction,
  flyoutActions,
  children,
}: BaseFeaturesTableProps) => {
  const handleCloseFlyout = useCallback(() => {
    onSelectFeature(null);
  }, [onSelectFeature]);

  const isSelectionActionsDisabled =
    selectedFeatures.length === 0 || isLoadingFeatures || isIdentifyingFeatures;

  return (
    <EuiPanel hasShadow={false} hasBorder={false} paddingSize="m">
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={false}>
          <TableTitle
            pageIndex={pagination.pageIndex}
            pageSize={pagination.pageSize}
            total={features.length}
            label={titleLabel}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            iconType="cross"
            size="xs"
            aria-label={CLEAR_SELECTION}
            isDisabled={isSelectionActionsDisabled}
            onClick={clearSelection}
          >
            {CLEAR_SELECTION}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            isLoading={bulkAction.isLoading}
            size="xs"
            iconType={bulkAction.iconType}
            color={bulkAction.color}
            aria-label={bulkAction.label}
            isDisabled={isSelectionActionsDisabled}
            onClick={bulkAction.onClick}
          >
            {bulkAction.label}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiHorizontalRule margin="none" style={{ height: 2 }} />
      <EuiInMemoryTable
        loading={isLoadingFeatures}
        tableCaption={tableCaptionLabel}
        items={items}
        itemId="uuid"
        columns={columns}
        noItemsMessage={noItemsMessage}
        pagination={{
          ...pagination,
          pageSizeOptions: [5, 10, 25],
        }}
        onTableChange={handleTableChange}
        selection={{
          initialSelected: selectedFeatures,
          onSelectionChange: setSelectedFeatures,
          selected: selectedFeatures,
          selectable: () => !isIdentifyingFeatures,
        }}
      />
      {selectedFeature && (
        <FeatureDetailsFlyout
          feature={selectedFeature}
          onClose={handleCloseFlyout}
          {...flyoutActions}
        />
      )}
      {children}
    </EuiPanel>
  );
};

const CLEAR_SELECTION = i18n.translate('xpack.streams.baseFeaturesTable.clearSelection', {
  defaultMessage: 'Clear selection',
});
