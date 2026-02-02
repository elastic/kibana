/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiBasicTable,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiLink,
  EuiText,
  useEuiTheme,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { upperFirst } from 'lodash';
import React, { useState, useCallback } from 'react';
import { useFetchFeatures, type FeatureWithStream } from '../../../hooks/use_fetch_features';
import { LoadingPanel } from '../../loading_panel';
import { useKibana } from '../../../hooks/use_kibana';
import { FeatureDetailsFlyout } from '../../stream_detail_systems/stream_features/feature_details_flyout';
import { getConfidenceColor } from '../../stream_detail_systems/stream_features/use_stream_features_table';

export function FeaturesTable() {
  const { euiTheme } = useEuiTheme();
  const { unifiedSearch } = useKibana().dependencies.start;
  const [searchQuery, setSearchQuery] = useState('');
  const { data, isLoading: loading } = useFetchFeatures({ query: searchQuery });
  const [selectedFeature, setSelectedFeature] = useState<FeatureWithStream | null>(null);

  const handleSelectFeature = useCallback((feature: FeatureWithStream | null) => {
    setSelectedFeature(feature);
  }, []);

  const handleCloseFlyout = useCallback(() => {
    setSelectedFeature(null);
  }, []);

  if (loading && !data) {
    return <LoadingPanel size="l" />;
  }

  const columns: Array<EuiBasicTableColumn<FeatureWithStream>> = [
    {
      field: 'details',
      name: '',
      width: '40px',
      render: (_: unknown, feature: FeatureWithStream) => (
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
      name: i18n.translate('xpack.streams.significantEventsDiscovery.featuresTable.featureColumn', {
        defaultMessage: 'Feature',
      }),
      truncateText: true,
      render: (feature: FeatureWithStream) => {
        const displayTitle = feature.title ?? Object.values(feature.value).join(', ');
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
                  {feature.name}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiLink>
        );
      },
    },
    {
      field: 'stream_name',
      name: i18n.translate('xpack.streams.significantEventsDiscovery.featuresTable.streamColumn', {
        defaultMessage: 'Stream',
      }),
      width: '15%',
      render: (_: unknown, feature: FeatureWithStream) => (
        <EuiBadge color="hollow">{feature.stream_name || '--'}</EuiBadge>
      ),
    },
    {
      field: 'type',
      name: i18n.translate('xpack.streams.significantEventsDiscovery.featuresTable.typeColumn', {
        defaultMessage: 'Type',
      }),
      width: '15%',
      render: (type: string) => <EuiBadge color="hollow">{upperFirst(type)}</EuiBadge>,
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
        <EuiHealth color={getConfidenceColor(confidence)}>{confidence}</EuiHealth>
      ),
    },
  ];

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem>
            <unifiedSearch.ui.SearchBar
              appName="streamsApp"
              showFilterBar={false}
              showQueryMenu={false}
              showQueryInput
              showDatePicker={false}
              submitButtonStyle="iconOnly"
              displayStyle="inPage"
              disableQueryLanguageSwitcher
              onQuerySubmit={(queryPayload) => {
                setSearchQuery(String(queryPayload.query?.query ?? ''));
              }}
              query={{
                query: searchQuery,
                language: 'text',
              }}
              isLoading={loading}
              placeholder={i18n.translate(
                'xpack.streams.significantEventsDiscovery.featuresTable.searchPlaceholder',
                { defaultMessage: 'Search features' }
              )}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s">
          {i18n.translate('xpack.streams.significantEventsDiscovery.featuresTable.featuresCount', {
            defaultMessage: '{count} Features',
            values: { count: data?.features.length ?? 0 },
          })}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiBasicTable
          css={css`
            & thead tr {
              background-color: ${euiTheme.colors.backgroundBaseSubdued};
            }
          `}
          tableCaption={i18n.translate(
            'xpack.streams.significantEventsDiscovery.featuresTable.tableCaption',
            { defaultMessage: 'Features table' }
          )}
          columns={columns}
          itemId="id"
          items={data?.features ?? []}
          loading={loading}
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
