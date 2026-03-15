/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo } from 'react';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import type { EuiBasicTableColumn, CriteriaWithPagination } from '@elastic/eui';
import { EuiBadge, EuiText, EuiButtonIcon, EuiLink, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { Feature, Streams } from '@kbn/streams-schema';
import { i18n } from '@kbn/i18n';
import { upperFirst } from 'lodash';
import { useKibana } from '../../../hooks/use_kibana';
import { useStreamFeaturesApi } from '../../../hooks/use_stream_features_api';

interface UseDeletedFeaturesTableProps {
  definition: Streams.all.Definition;
  deletedFeatures: Feature[];
  refreshFeatures: () => void;
  isIdentifyingFeatures: boolean;
  selectedFeature: Feature | null;
  onSelectFeature: (feature: Feature | null) => void;
}

export function useDeletedFeaturesTable({
  definition,
  deletedFeatures,
  refreshFeatures,
  isIdentifyingFeatures,
  selectedFeature,
  onSelectFeature,
}: UseDeletedFeaturesTableProps) {
  const {
    core: { notifications },
  } = useKibana();
  const { restoreFeaturesInBulk } = useStreamFeaturesApi(definition);

  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [selectedFeatures, setSelectedFeatures] = useState<Feature[]>([]);

  const [{ loading: isRestoring }, handleRestoreFeature] = useAsyncFn(async () => {
    if (!selectedFeature) return;

    try {
      await restoreFeaturesInBulk([selectedFeature.uuid]);
      notifications.toasts.addSuccess({
        title: RESTORE_SUCCESS_TITLE,
        text: RESTORE_SUCCESS_TEXT,
      });
      onSelectFeature(null);
      refreshFeatures();
    } catch (error) {
      notifications.toasts.addError(error instanceof Error ? error : new Error(String(error)), {
        title: RESTORE_ERROR_TITLE,
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
        title: i18n.translate('xpack.streams.deletedFeaturesTable.bulkRestoreSuccess.title', {
          defaultMessage: '{count, plural, one {Feature restored} other {Features restored}}',
          values: { count: selectedFeatures.length },
        }),
        text: i18n.translate('xpack.streams.deletedFeaturesTable.bulkRestoreSuccess.text', {
          defaultMessage:
            '{count, plural, one {The feature has} other {# features have}} been successfully restored.',
          values: { count: selectedFeatures.length },
        }),
      });
      setSelectedFeatures([]);
      refreshFeatures();
    } catch (error) {
      notifications.toasts.addError(error instanceof Error ? error : new Error(String(error)), {
        title: i18n.translate('xpack.streams.deletedFeaturesTable.bulkRestoreError.title', {
          defaultMessage: 'Failed to restore features',
        }),
      });
    }
  }, [selectedFeatures, restoreFeaturesInBulk, refreshFeatures, notifications.toasts]);

  const clearSelection = useCallback(() => {
    setSelectedFeatures([]);
  }, []);

  const handleTableChange = useCallback(({ page }: CriteriaWithPagination<Feature>) => {
    if (page) {
      setPagination({ pageIndex: page.index, pageSize: page.size });
    }
  }, []);

  const columns: Array<EuiBasicTableColumn<Feature>> = useMemo(
    () => [
      {
        field: 'details',
        name: '',
        width: '40px',
        render: (_, feature: Feature) => (
          <EuiButtonIcon
            data-test-subj="streamsAppDeletedFeatureDetailsButton"
            iconType="expand"
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
              data-test-subj="streamsAppDeletedFeatureNameLink"
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
        field: 'deleted_at',
        name: DELETED_AT_COLUMN_HEADER_LABEL,
        width: '20%',
        render: (deletedAt: string) => (
          <EuiText size="s">{new Date(deletedAt).toLocaleString()}</EuiText>
        ),
      },
    ],
    [isIdentifyingFeatures, onSelectFeature]
  );

  return {
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
    isIdentifyingFeatures,
    items: deletedFeatures,
    noItemsMessage: NO_DELETED_FEATURES_MESSAGE,
  };
}

const FEATURE_COLUMN_HEADER_LABEL = i18n.translate(
  'xpack.streams.deletedFeaturesTable.columns.featureColumnHeader',
  { defaultMessage: 'Feature' }
);

const TYPE_COLUMN_HEADER_LABEL = i18n.translate(
  'xpack.streams.deletedFeaturesTable.columns.typeColumnHeader',
  { defaultMessage: 'Type' }
);

const DELETED_AT_COLUMN_HEADER_LABEL = i18n.translate(
  'xpack.streams.deletedFeaturesTable.columns.deletedAtColumnHeader',
  { defaultMessage: 'Deleted at' }
);

export const DELETED_FEATURES_LABEL = i18n.translate(
  'xpack.streams.deletedFeaturesTable.tableTitle',
  { defaultMessage: 'Deleted features' }
);

export const DELETED_TABLE_CAPTION_LABEL = i18n.translate(
  'xpack.streams.deletedFeaturesTable.tableCaption',
  { defaultMessage: 'List of deleted features' }
);

export const RESTORE_SELECTED = i18n.translate(
  'xpack.streams.deletedFeaturesTable.columns.actions.restoreSelection',
  { defaultMessage: 'Restore selected' }
);

const VIEW_DETAILS_ARIA_LABEL = i18n.translate(
  'xpack.streams.deletedFeaturesTable.detailsButtonAriaLabel',
  { defaultMessage: 'View details' }
);

const NO_DELETED_FEATURES_MESSAGE = i18n.translate(
  'xpack.streams.deletedFeaturesTable.noDeletedFeaturesMessage',
  { defaultMessage: 'No deleted features' }
);

const RESTORE_SUCCESS_TITLE = i18n.translate(
  'xpack.streams.deletedFeaturesTable.restoreSuccess.title',
  { defaultMessage: 'Feature restored' }
);

const RESTORE_SUCCESS_TEXT = i18n.translate(
  'xpack.streams.deletedFeaturesTable.restoreSuccess.text',
  { defaultMessage: 'The feature has been successfully restored.' }
);

const RESTORE_ERROR_TITLE = i18n.translate(
  'xpack.streams.deletedFeaturesTable.restoreError.title',
  { defaultMessage: 'Failed to restore feature' }
);
