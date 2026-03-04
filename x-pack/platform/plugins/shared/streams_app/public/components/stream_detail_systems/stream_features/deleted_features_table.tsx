/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { Feature, Streams } from '@kbn/streams-schema';
import { BaseFeaturesTable } from './base_features_table';
import {
  useDeletedFeaturesTable,
  DELETED_FEATURES_LABEL,
  DELETED_TABLE_CAPTION_LABEL,
  RESTORE_SELECTED,
} from './use_deleted_features_table';

interface DeletedFeaturesTableProps {
  definition: Streams.all.Definition;
  isLoadingFeatures: boolean;
  deletedFeatures: Feature[];
  refreshFeatures: () => void;
  isIdentifyingFeatures: boolean;
  selectedFeature: Feature | null;
  onSelectFeature: (feature: Feature | null) => void;
}

export function DeletedFeaturesTable({
  definition,
  isLoadingFeatures,
  deletedFeatures,
  refreshFeatures,
  isIdentifyingFeatures,
  selectedFeature,
  onSelectFeature,
}: DeletedFeaturesTableProps) {
  const {
    pagination,
    selectedFeatures,
    setSelectedFeatures,
    handleRestoreFeature,
    handleBulkRestore,
    clearSelection,
    handleTableChange,
    isRestoring,
    isBulkRestoring,
    columns,
    items,
    noItemsMessage,
  } = useDeletedFeaturesTable({
    definition,
    deletedFeatures,
    refreshFeatures,
    isIdentifyingFeatures,
    selectedFeature,
    onSelectFeature,
  });

  const bulkAction = useMemo(
    () => ({
      label: RESTORE_SELECTED,
      iconType: 'returnKey',
      isLoading: isBulkRestoring,
      onClick: handleBulkRestore,
    }),
    [isBulkRestoring, handleBulkRestore]
  );

  const flyoutActions = useMemo(
    () => ({ onRestore: handleRestoreFeature, isRestoring }),
    [handleRestoreFeature, isRestoring]
  );

  return (
    <BaseFeaturesTable
      titleLabel={DELETED_FEATURES_LABEL}
      tableCaptionLabel={DELETED_TABLE_CAPTION_LABEL}
      isLoadingFeatures={isLoadingFeatures}
      isIdentifyingFeatures={isIdentifyingFeatures}
      features={deletedFeatures}
      selectedFeature={selectedFeature}
      onSelectFeature={onSelectFeature}
      pagination={pagination}
      selectedFeatures={selectedFeatures}
      setSelectedFeatures={setSelectedFeatures}
      clearSelection={clearSelection}
      handleTableChange={handleTableChange}
      columns={columns}
      items={items}
      noItemsMessage={noItemsMessage}
      bulkAction={bulkAction}
      flyoutActions={flyoutActions}
    />
  );
}
