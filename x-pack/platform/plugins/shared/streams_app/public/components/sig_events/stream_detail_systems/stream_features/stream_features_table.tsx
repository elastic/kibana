/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiHorizontalRule,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiButtonEmpty,
  EuiPanel,
} from '@elastic/eui';
import type { Feature, Streams } from '@kbn/streams-schema';
import { FeatureDetailsFlyout } from './feature_details_flyout';
import { DeleteFeatureModal } from './delete_feature_modal';
import {
  useStreamFeaturesTable,
  TABLE_CAPTION_LABEL,
  CLEAR_SELECTION,
  type FeaturesTableMode,
} from './use_stream_features_table';
import { TableTitle } from '../table_title';

interface StreamFeaturesTableProps {
  definition: Streams.all.Definition;
  isLoadingFeatures: boolean;
  features: Feature[];
  refreshFeatures: () => void;
  isIdentifyingFeatures: boolean;
  selectedFeature: Feature | null;
  onSelectFeature: (feature: Feature | null) => void;
  mode: FeaturesTableMode;
}

export function StreamFeaturesTable({
  definition,
  isLoadingFeatures,
  features,
  refreshFeatures,
  isIdentifyingFeatures,
  selectedFeature,
  onSelectFeature,
  mode,
}: StreamFeaturesTableProps) {
  const {
    pagination,
    selectedFeatures,
    setSelectedFeatures,
    isBulkDeleteModalVisible,
    isIdentifyingFeatures: isTableDisabled,
    hideBulkDeleteModal,
    handleBulkDelete,
    isBulkDeleting,
    clearSelection,
    handleTableChange,
    columns,
    noItemsMessage,
    bulkActions,
    flyoutActions,
    label,
    items,
  } = useStreamFeaturesTable({
    definition,
    features,
    refreshFeatures,
    isIdentifyingFeatures,
    selectedFeature,
    onSelectFeature,
    mode,
  });

  const handleCloseFlyout = useCallback(() => {
    onSelectFeature(null);
  }, [onSelectFeature]);

  const isSelectionActionsDisabled =
    selectedFeatures.length === 0 || isLoadingFeatures || isTableDisabled;

  return (
    <EuiPanel hasShadow={false} hasBorder={false} paddingSize="m">
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={false}>
          <TableTitle
            pageIndex={pagination.pageIndex}
            pageSize={pagination.pageSize}
            total={features.length}
            label={label}
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
        {bulkActions.map((action) => (
          <EuiFlexItem grow={false} key={action.label}>
            <EuiButtonEmpty
              isLoading={action.isLoading}
              size="xs"
              iconType={action.iconType}
              color={action.color}
              aria-label={action.label}
              isDisabled={isSelectionActionsDisabled}
              onClick={action.onClick}
            >
              {action.label}
            </EuiButtonEmpty>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiHorizontalRule margin="none" style={{ height: 2 }} />
      <EuiInMemoryTable
        loading={isLoadingFeatures}
        tableCaption={TABLE_CAPTION_LABEL}
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
          selectable: () => !isTableDisabled,
        }}
      />
      {selectedFeature && (
        <FeatureDetailsFlyout
          feature={selectedFeature}
          onClose={handleCloseFlyout}
          onDelete={flyoutActions.onDelete}
          isDeleting={flyoutActions.isDeleting}
          onExclude={flyoutActions.onExclude}
          isExcluding={flyoutActions.isExcluding}
          onRestore={flyoutActions.onRestore}
          isRestoring={flyoutActions.isRestoring}
        />
      )}
      {isBulkDeleteModalVisible && selectedFeatures.length > 0 && (
        <DeleteFeatureModal
          features={selectedFeatures}
          isLoading={isBulkDeleting}
          onCancel={hideBulkDeleteModal}
          onConfirm={handleBulkDelete}
        />
      )}
    </EuiPanel>
  );
}
