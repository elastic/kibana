/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { sortBy } from 'lodash';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import { useBoolean } from '@kbn/react-hooks';
import type { CriteriaWithPagination } from '@elastic/eui';
import {
  EuiBadge,
  EuiHealth,
  EuiText,
  EuiButtonIcon,
  EuiLink,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import type { Feature, Streams } from '@kbn/streams-schema';
import { i18n } from '@kbn/i18n';
import { upperFirst } from 'lodash';
import { useKibana } from '../../../../hooks/use_kibana';
import { useStreamFeaturesApi } from '../../../../hooks/sig_events/use_stream_features_api';

export type FeaturesTableMode = 'active' | 'excluded';

export function getConfidenceColor(confidence: number): string {
  if (confidence >= 70) return 'success';
  if (confidence >= 40) return 'warning';
  return 'danger';
}

export function getStatusColor(status: Feature['status']): 'success' | 'danger' | 'warning' {
  switch (status) {
    case 'active':
      return 'success';
    case 'stale':
      return 'warning';
    case 'expired':
      return 'danger';
    default:
      return 'success';
  }
}

interface UseStreamFeaturesTableProps {
  definition: Streams.all.Definition;
  features: Feature[];
  refreshFeatures: () => void;
  isIdentifyingFeatures: boolean;
  selectedFeature: Feature | null;
  onSelectFeature: (feature: Feature | null) => void;
  mode: FeaturesTableMode;
}

export function useStreamFeaturesTable({
  definition,
  features,
  refreshFeatures,
  isIdentifyingFeatures,
  selectedFeature,
  onSelectFeature,
  mode,
}: UseStreamFeaturesTableProps) {
  const {
    core: { notifications },
  } = useKibana();
  const { deleteFeature, deleteFeaturesInBulk, excludeFeaturesInBulk, restoreFeaturesInBulk } =
    useStreamFeaturesApi(definition);

  const sortedFeatures = useMemo(
    () => sortBy(features, (f) => (f.title ?? f.id).toLowerCase()),
    [features]
  );

  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [selectedFeatures, setSelectedFeatures] = useState<Feature[]>([]);
  const [isBulkDeleteModalVisible, { on: showBulkDeleteModal, off: hideBulkDeleteModal }] =
    useBoolean(false);

  // --- Delete (shared by both modes) ---

  const [{ loading: isDeleting }, handleDeleteFeature] = useAsyncFn(async () => {
    if (!selectedFeature) return;

    try {
      await deleteFeature(selectedFeature.uuid);
      notifications.toasts.addSuccess({
        title: i18n.translate('xpack.streams.streamFeaturesTable.deleteSuccess.title', {
          defaultMessage: 'Feature deleted',
        }),
        text: i18n.translate('xpack.streams.streamFeaturesTable.deleteSuccess.text', {
          defaultMessage: 'The feature has been successfully deleted.',
        }),
      });
      onSelectFeature(null);
      refreshFeatures();
    } catch (error) {
      notifications.toasts.addError(error instanceof Error ? error : new Error(String(error)), {
        title: i18n.translate('xpack.streams.streamFeaturesTable.deleteError.title', {
          defaultMessage: 'Failed to delete feature',
        }),
      });
    }
  }, [selectedFeature, deleteFeature, refreshFeatures, notifications.toasts, onSelectFeature]);

  const [{ loading: isBulkDeleting }, handleBulkDelete] = useAsyncFn(async () => {
    if (selectedFeatures.length === 0) return;

    try {
      await deleteFeaturesInBulk(selectedFeatures.map(({ uuid }) => uuid));
      notifications.toasts.addSuccess({
        title: i18n.translate('xpack.streams.streamFeaturesTable.bulkDeleteSuccess.title', {
          defaultMessage: '{count, plural, one {Feature deleted} other {Features deleted}}',
          values: { count: selectedFeatures.length },
        }),
        text: i18n.translate('xpack.streams.streamFeaturesTable.bulkDeleteSuccess.text', {
          defaultMessage:
            '{count, plural, one {The feature has} other {# features have}} been successfully deleted.',
          values: { count: selectedFeatures.length },
        }),
      });
      setSelectedFeatures([]);
      hideBulkDeleteModal();
      refreshFeatures();
    } catch (error) {
      notifications.toasts.addError(error instanceof Error ? error : new Error(String(error)), {
        title: i18n.translate('xpack.streams.streamFeaturesTable.bulkDeleteError.title', {
          defaultMessage: 'Failed to delete features',
        }),
      });
    }
  }, [
    selectedFeatures,
    deleteFeaturesInBulk,
    refreshFeatures,
    notifications.toasts,
    hideBulkDeleteModal,
  ]);

  // --- Exclude (active mode only) ---

  const [{ loading: isExcluding }, handleExcludeFeature] = useAsyncFn(async () => {
    if (!selectedFeature) return;

    try {
      await excludeFeaturesInBulk([selectedFeature.uuid]);
      notifications.toasts.addSuccess({
        title: i18n.translate('xpack.streams.streamFeaturesTable.excludeSuccess.title', {
          defaultMessage: 'Feature excluded',
        }),
        text: i18n.translate('xpack.streams.streamFeaturesTable.excludeSuccess.text', {
          defaultMessage: 'The feature has been successfully excluded.',
        }),
      });
      onSelectFeature(null);
      refreshFeatures();
    } catch (error) {
      notifications.toasts.addError(error instanceof Error ? error : new Error(String(error)), {
        title: i18n.translate('xpack.streams.streamFeaturesTable.excludeError.title', {
          defaultMessage: 'Failed to exclude feature',
        }),
      });
    }
  }, [
    selectedFeature,
    excludeFeaturesInBulk,
    refreshFeatures,
    notifications.toasts,
    onSelectFeature,
  ]);

  const [{ loading: isBulkExcluding }, handleBulkExclude] = useAsyncFn(async () => {
    if (selectedFeatures.length === 0) return;

    try {
      await excludeFeaturesInBulk(selectedFeatures.map(({ uuid }) => uuid));
      notifications.toasts.addSuccess({
        title: i18n.translate('xpack.streams.streamFeaturesTable.bulkExcludeSuccess.title', {
          defaultMessage: '{count, plural, one {Feature excluded} other {Features excluded}}',
          values: { count: selectedFeatures.length },
        }),
        text: i18n.translate('xpack.streams.streamFeaturesTable.bulkExcludeSuccess.text', {
          defaultMessage:
            '{count, plural, one {The feature has} other {# features have}} been successfully excluded.',
          values: { count: selectedFeatures.length },
        }),
      });
      setSelectedFeatures([]);
      refreshFeatures();
    } catch (error) {
      notifications.toasts.addError(error instanceof Error ? error : new Error(String(error)), {
        title: i18n.translate('xpack.streams.streamFeaturesTable.bulkExcludeError.title', {
          defaultMessage: 'Failed to exclude features',
        }),
      });
    }
  }, [selectedFeatures, excludeFeaturesInBulk, refreshFeatures, notifications.toasts]);

  // --- Restore (excluded mode only) ---

  const [{ loading: isRestoring }, handleRestoreFeature] = useAsyncFn(async () => {
    if (!selectedFeature) return;

    try {
      await restoreFeaturesInBulk([selectedFeature.uuid]);
      notifications.toasts.addSuccess({
        title: i18n.translate('xpack.streams.streamFeaturesTable.restoreSuccess.title', {
          defaultMessage: 'Feature restored',
        }),
        text: i18n.translate('xpack.streams.streamFeaturesTable.restoreSuccess.text', {
          defaultMessage: 'The feature has been successfully restored.',
        }),
      });
      onSelectFeature(null);
      refreshFeatures();
    } catch (error) {
      notifications.toasts.addError(error instanceof Error ? error : new Error(String(error)), {
        title: i18n.translate('xpack.streams.streamFeaturesTable.restoreError.title', {
          defaultMessage: 'Failed to restore feature',
        }),
      });
    }
  }, [
    selectedFeature,
    restoreFeaturesInBulk,
    refreshFeatures,
    notifications.toasts,
    onSelectFeature,
  ]);

  const [{ loading: isBulkRestoring }, handleBulkRestore] = useAsyncFn(async () => {
    if (selectedFeatures.length === 0) return;

    try {
      await restoreFeaturesInBulk(selectedFeatures.map(({ uuid }) => uuid));
      notifications.toasts.addSuccess({
        title: i18n.translate('xpack.streams.streamFeaturesTable.bulkRestoreSuccess.title', {
          defaultMessage: '{count, plural, one {Feature restored} other {Features restored}}',
          values: { count: selectedFeatures.length },
        }),
        text: i18n.translate('xpack.streams.streamFeaturesTable.bulkRestoreSuccess.text', {
          defaultMessage:
            '{count, plural, one {The feature has} other {# features have}} been successfully restored.',
          values: { count: selectedFeatures.length },
        }),
      });
      setSelectedFeatures([]);
      refreshFeatures();
    } catch (error) {
      notifications.toasts.addError(error instanceof Error ? error : new Error(String(error)), {
        title: i18n.translate('xpack.streams.streamFeaturesTable.bulkRestoreError.title', {
          defaultMessage: 'Failed to restore features',
        }),
      });
    }
  }, [selectedFeatures, restoreFeaturesInBulk, refreshFeatures, notifications.toasts]);

  // --- Shared ---

  const clearSelection = useCallback(() => {
    setSelectedFeatures([]);
  }, []);

  const handleTableChange = useCallback(({ page }: CriteriaWithPagination<Feature>) => {
    if (page) {
      setPagination({ pageIndex: page.index, pageSize: page.size });
    }
  }, []);

  const columns = useMemo(
    () => [
      {
        field: 'details',
        name: '',
        width: '40px',
        render: (_: unknown, feature: Feature) => (
          <EuiButtonIcon
            data-test-subj="streamsAppFeatureDetailsButton"
            iconType="maximize"
            isDisabled={isIdentifyingFeatures}
            aria-label={VIEW_DETAILS_ARIA_LABEL}
            onClick={() => onSelectFeature(feature)}
          />
        ),
      },
      {
        name: FEATURE_COLUMN_HEADER_LABEL,
        truncateText: true,
        render: (feature: Feature) => {
          const displayTitle = feature.title ?? feature.id;
          return (
            <EuiLink
              onClick={() => onSelectFeature(feature)}
              disabled={isIdentifyingFeatures}
              data-test-subj="streamsAppFeatureNameLink"
            >
              <EuiFlexGroup direction="column" gutterSize="none">
                <EuiFlexItem grow={false}>
                  <EuiText size="s">{displayTitle}</EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">
                    {feature.subtype}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiLink>
          );
        },
      },
      {
        field: 'type',
        name: TYPE_COLUMN_HEADER_LABEL,
        width: '15%',
        render: (type: string) => <EuiBadge color="hollow">{upperFirst(type)}</EuiBadge>,
      },
      {
        field: 'confidence',
        name: CONFIDENCE_COLUMN_HEADER_LABEL,
        width: '12%',
        render: (confidence: number) => (
          <EuiHealth color={getConfidenceColor(confidence)}>{confidence}</EuiHealth>
        ),
      },
    ],
    [isIdentifyingFeatures, onSelectFeature]
  );

  const bulkActions = useMemo(() => {
    if (mode === 'active') {
      return [
        {
          label: EXCLUDE_SELECTED,
          iconType: 'eyeClosed',
          color: 'warning' as const,
          isLoading: isBulkExcluding,
          onClick: handleBulkExclude,
        },
        {
          label: DELETE_SELECTED,
          iconType: 'trash',
          color: 'danger' as const,
          isLoading: isBulkDeleting,
          onClick: showBulkDeleteModal,
        },
      ];
    }
    return [
      {
        label: RESTORE_SELECTED,
        iconType: 'eye',
        color: 'primary' as const,
        isLoading: isBulkRestoring,
        onClick: handleBulkRestore,
      },
      {
        label: DELETE_SELECTED,
        iconType: 'trash',
        color: 'danger' as const,
        isLoading: isBulkDeleting,
        onClick: showBulkDeleteModal,
      },
    ];
  }, [
    mode,
    isBulkExcluding,
    handleBulkExclude,
    isBulkRestoring,
    handleBulkRestore,
    isBulkDeleting,
    showBulkDeleteModal,
  ]);

  const flyoutActions = useMemo(() => {
    if (mode === 'active') {
      return {
        onDelete: handleDeleteFeature,
        isDeleting,
        onExclude: handleExcludeFeature,
        isExcluding,
      };
    }
    return {
      onDelete: handleDeleteFeature,
      isDeleting,
      onRestore: handleRestoreFeature,
      isRestoring,
    };
  }, [
    mode,
    handleDeleteFeature,
    isDeleting,
    handleExcludeFeature,
    isExcluding,
    handleRestoreFeature,
    isRestoring,
  ]);

  return {
    pagination,
    selectedFeatures,
    setSelectedFeatures,
    isBulkDeleteModalVisible,
    isIdentifyingFeatures,
    showBulkDeleteModal,
    hideBulkDeleteModal,
    handleBulkDelete,
    isBulkDeleting,
    clearSelection,
    handleTableChange,
    columns,
    items: sortedFeatures,
    noItemsMessage: NO_FEATURES_MESSAGE,
    bulkActions,
    flyoutActions,
    label: mode === 'active' ? FEATURES_LABEL : EXCLUDED_FEATURES_LABEL,
  };
}

const FEATURE_COLUMN_HEADER_LABEL = i18n.translate(
  'xpack.streams.streamFeaturesTable.columns.featureColumnHeader',
  { defaultMessage: 'Feature' }
);

const TYPE_COLUMN_HEADER_LABEL = i18n.translate(
  'xpack.streams.streamFeaturesTable.columns.typeColumnHeader',
  { defaultMessage: 'Type' }
);

const CONFIDENCE_COLUMN_HEADER_LABEL = i18n.translate(
  'xpack.streams.streamFeaturesTable.columns.confidenceColumnHeader',
  { defaultMessage: 'Confidence' }
);

export const FEATURES_LABEL = i18n.translate('xpack.streams.streamFeaturesTable.tableTitle', {
  defaultMessage: 'Features',
});

const EXCLUDED_FEATURES_LABEL = i18n.translate(
  'xpack.streams.streamFeaturesTable.excludedTableTitle',
  { defaultMessage: 'Excluded features' }
);

export const TABLE_CAPTION_LABEL = i18n.translate(
  'xpack.streams.streamFeaturesTable.tableCaption',
  { defaultMessage: 'List of features' }
);

export const CLEAR_SELECTION = i18n.translate(
  'xpack.streams.streamFeaturesTable.columns.actions.clearSelection',
  { defaultMessage: 'Clear selection' }
);

export const DELETE_SELECTED = i18n.translate(
  'xpack.streams.streamFeaturesTable.columns.actions.deleteSelection',
  { defaultMessage: 'Delete selected' }
);

const EXCLUDE_SELECTED = i18n.translate(
  'xpack.streams.streamFeaturesTable.columns.actions.excludeSelection',
  { defaultMessage: 'Exclude selected' }
);

const RESTORE_SELECTED = i18n.translate(
  'xpack.streams.streamFeaturesTable.columns.actions.restoreSelection',
  { defaultMessage: 'Restore selected' }
);

const VIEW_DETAILS_ARIA_LABEL = i18n.translate(
  'xpack.streams.streamFeaturesTable.detailsButtonAriaLabel',
  { defaultMessage: 'View details' }
);

const NO_FEATURES_MESSAGE = i18n.translate('xpack.streams.streamFeaturesTable.noFeaturesMessage', {
  defaultMessage: 'No features found',
});
