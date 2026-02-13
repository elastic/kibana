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
import { TableTitle } from '../stream_systems/table_title';
import { FeatureDetailsFlyout } from './feature_details_flyout';
import { DeleteFeatureModal } from './delete_feature_modal';
import {
  useStreamFeaturesTable,
  FEATURES_LABEL,
  TABLE_CAPTION_LABEL,
  CLEAR_SELECTION,
  DELETE_SELECTED,
} from './use_stream_features_table';

interface StreamFeaturesTableProps {
  definition: Streams.all.Definition;
  isLoadingFeatures: boolean;
  features: Feature[];
  refreshFeatures: () => void;
  isIdentifyingFeatures: boolean;
  selectedFeature: Feature | null;
  onSelectFeature: (feature: Feature | null) => void;
}

export function StreamFeaturesTable({
  definition,
  isLoadingFeatures,
  features,
  refreshFeatures,
  isIdentifyingFeatures,
  selectedFeature,
  onSelectFeature,
}: StreamFeaturesTableProps) {
  const {
    pagination,
    selectedFeatures,
    setSelectedFeatures,
    isBulkDeleteModalVisible,
    isIdentifyingFeatures: isTableDisabled,
    showBulkDeleteModal,
    hideBulkDeleteModal,
    handleDeleteFeature,
    handleBulkDelete,
    clearSelection,
    handleTableChange,
    isDeleting,
    isBulkDeleting,
    columns,
    items,
    noItemsMessage,
  } = useStreamFeaturesTable({
    definition,
    features,
    refreshFeatures,
    isIdentifyingFeatures,
    selectedFeature,
    onSelectFeature,
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
            label={FEATURES_LABEL}
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
            isLoading={isBulkDeleting}
            size="xs"
            iconType="trash"
            color="danger"
            aria-label={DELETE_SELECTED}
            isDisabled={isSelectionActionsDisabled}
            onClick={showBulkDeleteModal}
          >
            {DELETE_SELECTED}
          </EuiButtonEmpty>
        </EuiFlexItem>
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
          onDelete={handleDeleteFeature}
          isDeleting={isDeleting}
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
