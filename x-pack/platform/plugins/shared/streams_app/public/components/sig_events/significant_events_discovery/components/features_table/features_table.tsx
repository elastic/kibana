/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiInMemoryTable,
  EuiLink,
  EuiText,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Feature } from '@kbn/streams-schema';
import { upperFirst } from 'lodash';
import React, { useState, useCallback, useMemo } from 'react';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import { useBoolean } from '@kbn/react-hooks';
import { AssetImage } from '../../../../asset_image';
import { useStreamsAppRouter } from '../../../../../hooks/use_streams_app_router';
import { useFetchFeatures } from '../../../../../hooks/sig_events/use_fetch_features';
import { useDiscoveryFeaturesApi } from '../../../../../hooks/sig_events/use_discovery_features_api';
import { useKibana } from '../../../../../hooks/use_kibana';
import { LoadingPanel } from '../../../../loading_panel';
import { FeatureDetailsFlyout } from '../../../stream_detail_systems/stream_features/feature_details_flyout';
import { DeleteFeatureModal } from '../../../stream_detail_systems/stream_features/delete_feature_modal';
import {
  getConfidenceColor,
  CLEAR_SELECTION,
  DELETE_SELECTED,
} from '../../../stream_detail_systems/stream_features/use_stream_features_table';

const featureKey = (feature: Feature) => `${feature.id}::${feature.stream_name}`;

export function FeaturesTable() {
  const router = useStreamsAppRouter();
  const { data, isLoading: loading, refetch } = useFetchFeatures();
  const { deleteFeaturesInBulk } = useDiscoveryFeaturesApi();
  const {
    core: { notifications },
  } = useKibana();

  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);
  const [selectedFeatures, setSelectedFeatures] = useState<Feature[]>([]);
  const [isBulkDeleteModalVisible, { on: showBulkDeleteModal, off: hideBulkDeleteModal }] =
    useBoolean(false);

  const handleSelectFeature = useCallback((feature: Feature) => {
    setSelectedFeature((prev) =>
      prev !== null && featureKey(prev) === featureKey(feature) ? null : feature
    );
  }, []);

  const handleCloseFlyout = useCallback(() => {
    setSelectedFeature(null);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedFeatures([]);
  }, []);

  const [{ loading: isBulkDeleting }, handleBulkDelete] = useAsyncFn(async () => {
    if (selectedFeatures.length === 0) return;

    try {
      const { succeededCount, failedCount } = await deleteFeaturesInBulk(selectedFeatures);

      hideBulkDeleteModal();

      if (failedCount === 0) {
        notifications.toasts.addSuccess({
          title: i18n.translate(
            'xpack.streams.significantEventsDiscovery.featuresTable.bulkDeleteSuccess.title',
            {
              defaultMessage: '{count, plural, one {Feature deleted} other {Features deleted}}',
              values: { count: succeededCount },
            }
          ),
          text: i18n.translate(
            'xpack.streams.significantEventsDiscovery.featuresTable.bulkDeleteSuccess.text',
            {
              defaultMessage:
                '{count, plural, one {The feature has} other {# features have}} been successfully deleted.',
              values: { count: succeededCount },
            }
          ),
        });
        setSelectedFeatures([]);
      } else if (succeededCount === 0) {
        notifications.toasts.addDanger({
          title: i18n.translate(
            'xpack.streams.significantEventsDiscovery.featuresTable.bulkDeleteError.title',
            {
              defaultMessage: 'Failed to delete features',
            }
          ),
          text: i18n.translate(
            'xpack.streams.significantEventsDiscovery.featuresTable.bulkDeleteError.text',
            {
              defaultMessage: 'None of the selected features could be deleted. Please try again.',
            }
          ),
        });
        setSelectedFeatures([]);
      } else {
        notifications.toasts.addWarning({
          title: i18n.translate(
            'xpack.streams.significantEventsDiscovery.featuresTable.bulkDeletePartial.title',
            {
              defaultMessage: 'Partially deleted features',
            }
          ),
          text: i18n.translate(
            'xpack.streams.significantEventsDiscovery.featuresTable.bulkDeletePartial.text',
            {
              defaultMessage:
                '{succeeded, plural, one {# feature was} other {# features were}} deleted, but {failed} could not be removed. Please try again for the remaining items.',
              values: { succeeded: succeededCount, failed: failedCount },
            }
          ),
        });
        setSelectedFeatures([]);
      }
    } catch (error) {
      hideBulkDeleteModal();
      setSelectedFeatures([]);
      notifications.toasts.addError(error instanceof Error ? error : new Error(String(error)), {
        title: i18n.translate(
          'xpack.streams.significantEventsDiscovery.featuresTable.bulkDeleteUnexpectedError.title',
          {
            defaultMessage: 'Failed to delete features',
          }
        ),
      });
    } finally {
      refetch();
    }
  }, [selectedFeatures, deleteFeaturesInBulk, refetch, notifications.toasts, hideBulkDeleteModal]);

  const columns: Array<EuiBasicTableColumn<Feature>> = useMemo(
    () => [
      {
        field: 'details',
        name: '',
        width: '40px',
        render: (_: unknown, feature: Feature) => {
          const isSelected =
            selectedFeature !== null && featureKey(selectedFeature) === featureKey(feature);
          return (
            <EuiButtonIcon
              data-test-subj="featuresDiscoveryDetailsButton"
              iconType={isSelected ? 'minimize' : 'maximize'}
              aria-label={i18n.translate(
                'xpack.streams.significantEventsDiscovery.knowledgeIndicatorsTable.detailsButtonAriaLabel',
                { defaultMessage: 'View details' }
              )}
              onClick={() => handleSelectFeature(feature)}
            />
          );
        },
      },
      {
        field: 'name',
        name: i18n.translate(
          'xpack.streams.significantEventsDiscovery.knowledgeIndicatorsTable.knowledgeIndicatorColumn',
          {
            defaultMessage: 'Knowledge Indicator',
          }
        ),
        sortable: (feature: Feature) => (feature.title ?? feature.id).toLowerCase(),
        truncateText: true,
        render: (_name: string, feature: Feature) => {
          const displayTitle = feature.title ?? feature.id;
          return (
            <EuiLink
              onClick={() => handleSelectFeature(feature)}
              data-test-subj="featuresDiscoveryFeatureNameLink"
            >
              <EuiText size="s">{displayTitle}</EuiText>
            </EuiLink>
          );
        },
      },
      {
        field: 'type',
        name: i18n.translate(
          'xpack.streams.significantEventsDiscovery.knowledgeIndicatorsTable.typeColumn',
          {
            defaultMessage: 'Type',
          }
        ),
        sortable: true,
        width: '15%',
        render: (type: string) => <EuiBadge color="hollow">{upperFirst(type ?? '–')}</EuiBadge>,
      },
      {
        field: 'confidence',
        name: i18n.translate(
          'xpack.streams.significantEventsDiscovery.knowledgeIndicatorsTable.confidenceColumn',
          {
            defaultMessage: 'Confidence',
          }
        ),
        sortable: true,
        width: '12%',
        render: (confidence: number) => (
          <EuiHealth color={getConfidenceColor(confidence ?? 0)}>{confidence ?? '–'}</EuiHealth>
        ),
      },
      {
        field: 'stream_name',
        name: i18n.translate(
          'xpack.streams.significantEventsDiscovery.knowledgeIndicatorsTable.streamColumn',
          {
            defaultMessage: 'Stream',
          }
        ),
        sortable: true,
        width: '15%',
        render: (_streamName: string, feature: Feature) => (
          <EuiBadge color="hollow">{feature.stream_name || '--'}</EuiBadge>
        ),
      },
    ],
    [handleSelectFeature, selectedFeature]
  );

  if (loading && !data) {
    return <LoadingPanel size="l" />;
  }

  if (!loading && data?.features.length === 0) {
    return (
      <EuiEmptyPrompt
        aria-live="polite"
        titleSize="xs"
        icon={<AssetImage type="knowledgeIndicatorsEmptyState" />}
        title={
          <h2>
            {i18n.translate(
              'xpack.streams.significantEventsDiscovery.knowledgeIndicatorsTable.emptyState.title',
              { defaultMessage: 'Knowledge indicators' }
            )}
          </h2>
        }
        body={
          <p>
            {i18n.translate(
              'xpack.streams.significantEventsDiscovery.knowledgeIndicatorsTable.emptyState.description',
              {
                defaultMessage:
                  'Facts about your stream automatically extracted from log data to power rule generation. To generate knowledge indicators, go to Streams tab and start onboarding.',
              }
            )}
          </p>
        }
        actions={
          <EuiButtonEmpty href={router.link('/_discovery/{tab}', { path: { tab: 'streams' } })}>
            {i18n.translate(
              'xpack.streams.significantEventsDiscovery.knowledgeIndicatorsTable.emptyState.goToStreamsButton',
              { defaultMessage: 'Go to Streams tab' }
            )}
          </EuiButtonEmpty>
        }
      />
    );
  }

  const isSelectionActionsDisabled = selectedFeatures.length === 0 || loading || isBulkDeleting;

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center" gutterSize="m">
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              {i18n.translate(
                'xpack.streams.significantEventsDiscovery.knowledgeIndicatorsTable.knowledgeIndicatorsCount',
                {
                  defaultMessage:
                    '{count} {count, plural, one {Knowledge Indicator} other {Knowledge Indicators}}',
                  values: { count: data?.features.length ?? 0 },
                }
              )}
            </EuiText>
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
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiInMemoryTable
          tableCaption={i18n.translate(
            'xpack.streams.significantEventsDiscovery.knowledgeIndicatorsTable.tableCaption',
            { defaultMessage: 'Knowledge Indicators table' }
          )}
          columns={columns}
          itemId={featureKey}
          items={data?.features ?? []}
          rowProps={(feature: Feature) => ({
            isSelected:
              selectedFeature !== null && featureKey(selectedFeature) === featureKey(feature),
          })}
          loading={loading}
          selection={{
            initialSelected: selectedFeatures,
            onSelectionChange: setSelectedFeatures,
            selected: selectedFeatures,
          }}
          sorting={{
            sort: {
              field: 'name',
              direction: 'asc',
            },
          }}
          search={{
            box: {
              incremental: true,
              placeholder: i18n.translate(
                'xpack.streams.significantEventsDiscovery.knowledgeIndicatorsTable.searchPlaceholder',
                { defaultMessage: 'Search knowledge indicators' }
              ),
            },
            filters: [],
          }}
          searchFormat="text"
          noItemsMessage={
            !loading
              ? i18n.translate(
                  'xpack.streams.significantEventsDiscovery.knowledgeIndicatorsTable.noItemsMessage',
                  {
                    defaultMessage: 'No knowledge indicators found',
                  }
                )
              : ''
          }
        />
      </EuiFlexItem>
      {selectedFeature && (
        <FeatureDetailsFlyout feature={selectedFeature} onClose={handleCloseFlyout} />
      )}
      {isBulkDeleteModalVisible && selectedFeatures.length > 0 && (
        <DeleteFeatureModal
          features={selectedFeatures}
          isLoading={isBulkDeleting}
          onCancel={hideBulkDeleteModal}
          onConfirm={handleBulkDelete}
        />
      )}
    </EuiFlexGroup>
  );
}
