/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiButtonIcon,
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
import React, { useState, useCallback } from 'react';
import { useFetchFeatures } from '../../../../hooks/use_fetch_features';
import { LoadingPanel } from '../../../loading_panel';
import { FeatureDetailsFlyout } from '../../../stream_detail_systems/stream_features/feature_details_flyout';
import { getConfidenceColor } from '../../../stream_detail_systems/stream_features/use_stream_features_table';

export function FeaturesTable() {
  const { data, isLoading: loading } = useFetchFeatures();
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);

  const handleSelectFeature = useCallback((feature: Feature | null) => {
    setSelectedFeature(feature);
  }, []);

  const handleCloseFlyout = useCallback(() => {
    setSelectedFeature(null);
  }, []);

  if (loading && !data) {
    return <LoadingPanel size="l" />;
  }

  const columns: Array<EuiBasicTableColumn<Feature>> = [
    {
      field: 'details',
      name: '',
      width: '40px',
      render: (_: unknown, feature: Feature) => (
        <EuiButtonIcon
          data-test-subj="featuresDiscoveryDetailsButton"
          iconType="expand"
          aria-label={i18n.translate(
            'xpack.streams.significantEventsDiscovery.featuresTable.detailsButtonAriaLabel',
            { defaultMessage: 'View details' }
          )}
          onClick={() => handleSelectFeature(feature)}
        />
      ),
    },
    {
      field: 'name',
      name: i18n.translate('xpack.streams.significantEventsDiscovery.featuresTable.featureColumn', {
        defaultMessage: 'Feature',
      }),
      truncateText: true,
      render: (_name: string, feature: Feature) => {
        const displayTitle = feature.title ?? feature.id;
        const secondaryText = feature.subtype ?? feature.type ?? '';
        return (
          <EuiLink
            onClick={() => handleSelectFeature(feature)}
            data-test-subj="featuresDiscoveryFeatureNameLink"
          >
            <EuiFlexGroup direction="column" gutterSize="none">
              <EuiFlexItem grow={false}>
                <EuiText size="s">{displayTitle}</EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {secondaryText}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiLink>
        );
      },
    },
    {
      field: 'type',
      name: i18n.translate('xpack.streams.significantEventsDiscovery.featuresTable.typeColumn', {
        defaultMessage: 'Type',
      }),
      width: '15%',
      render: (type: string) => <EuiBadge color="hollow">{upperFirst(type ?? '–')}</EuiBadge>,
    },
    {
      field: 'confidence',
      name: i18n.translate(
        'xpack.streams.significantEventsDiscovery.featuresTable.confidenceColumn',
        {
          defaultMessage: 'Confidence',
        }
      ),
      width: '12%',
      render: (confidence: number) => (
        <EuiHealth color={getConfidenceColor(confidence ?? 0)}>{confidence ?? '–'}</EuiHealth>
      ),
    },
    {
      field: 'stream_name',
      name: i18n.translate('xpack.streams.significantEventsDiscovery.featuresTable.streamColumn', {
        defaultMessage: 'Stream',
      }),
      width: '15%',
      render: (_streamName: string, feature: Feature) => (
        <EuiBadge color="hollow">{feature.stream_name || '--'}</EuiBadge>
      ),
    },
  ];

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem grow={false}>
        <EuiText size="s">
          {i18n.translate('xpack.streams.significantEventsDiscovery.featuresTable.featuresCount', {
            defaultMessage: '{count} Features',
            values: { count: data?.features.length ?? 0 },
          })}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiInMemoryTable
          tableCaption={i18n.translate(
            'xpack.streams.significantEventsDiscovery.featuresTable.tableCaption',
            { defaultMessage: 'Features table' }
          )}
          columns={columns}
          itemId="id"
          items={data?.features ?? []}
          loading={loading}
          search={{
            box: {
              incremental: true,
              placeholder: i18n.translate(
                'xpack.streams.significantEventsDiscovery.featuresTable.searchPlaceholder',
                { defaultMessage: 'Search features' }
              ),
            },
            filters: [],
          }}
          searchFormat="text"
          noItemsMessage={
            !loading
              ? i18n.translate(
                  'xpack.streams.significantEventsDiscovery.featuresTable.noItemsMessage',
                  {
                    defaultMessage: 'No features found',
                  }
                )
              : ''
          }
        />
      </EuiFlexItem>
      {selectedFeature && (
        <FeatureDetailsFlyout feature={selectedFeature} onClose={handleCloseFlyout} />
      )}
    </EuiFlexGroup>
  );
}
