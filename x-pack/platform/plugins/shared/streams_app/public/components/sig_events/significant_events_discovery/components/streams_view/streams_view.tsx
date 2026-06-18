/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSearchBarProps, Query } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiSearchBar, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { STREAMS_KIS_ONBOARDING_IN_PROGRESS_STATUSES } from '@kbn/streams-schema';
import React, { useCallback, useState } from 'react';
import type { TableRow } from './utils';
import { useAIFeatures } from '../../../../../hooks/use_ai_features';
import { useSignificantEventsDiscoveryContext } from '../../context/significant_events_discovery_context';
import { StreamsAppSearchBar } from '../../../../streams_app_search_bar';
import { useKiGeneration } from '../knowledge_indicators_table/ki_generation_context';
import { GenerateSplitButton } from '../shared/generate_split_button';
import { FindSignificantEventsButton } from './find_significant_events_button';
import { STREAMS_TABLE_SEARCH_ARIA_LABEL } from './translations';
import { StreamsTreeTable } from './tree_table';

const datePickerStyle = css`
  .euiFormControlLayout,
  .euiButton {
    height: 40px;
  }
`;

export function StreamsView() {
  const [searchQuery, setSearchQuery] = useState<Query | undefined>();

  const {
    filteredStreams,
    isStreamsLoading,
    isScheduling,
    onboardingConfig,
    setOnboardingConfig,
    featuresConnectors,
    queriesConnectors,
    generatingStreamNames,
    streamStatusMap,
    cancelOnboarding,
    bulkScheduleOnboarding,
    bulkOnboardAll,
    bulkOnboardFeaturesOnly,
    bulkOnboardQueriesOnly,
  } = useKiGeneration();

  const aiFeatures = useAIFeatures();
  const allConnectors = aiFeatures?.genAiConnectors?.connectors ?? [];
  const connectorError = aiFeatures?.genAiConnectors?.error;
  const isConnectorCatalogUnavailable =
    !allConnectors.length || !!aiFeatures?.genAiConnectors?.loading || !!connectorError;

  const { isRunning, isCanceling, handleRun, handleCancel } =
    useSignificantEventsDiscoveryContext();

  const isStreamActionable = useCallback(
    (streamName: string) => {
      if (generatingStreamNames.includes(streamName)) return false;
      const result = streamStatusMap[streamName];
      return !!result && !STREAMS_KIS_ONBOARDING_IN_PROGRESS_STATUSES.has(result.status);
    },
    [generatingStreamNames, streamStatusMap]
  );

  const [selectedStreams, setSelectedStreams] = useState<TableRow[]>([]);

  const handleQueryChange: EuiSearchBarProps['onChange'] = ({ query }) => {
    if (query) setSearchQuery(query);
  };

  const getActionableStreamNames = useCallback(
    () =>
      selectedStreams
        .filter((item) => isStreamActionable(item.stream.name))
        .map((item) => item.stream.name),
    [selectedStreams, isStreamActionable]
  );

  const onBulkOnboardStreamsClick = useCallback(async () => {
    const streamList = getActionableStreamNames();
    setSelectedStreams([]);
    await bulkOnboardAll(streamList);
  }, [getActionableStreamNames, bulkOnboardAll]);

  const onBulkOnboardFeaturesOnly = useCallback(async () => {
    const streamList = getActionableStreamNames();
    setSelectedStreams([]);
    await bulkOnboardFeaturesOnly(streamList);
  }, [getActionableStreamNames, bulkOnboardFeaturesOnly]);

  const onBulkOnboardQueriesOnly = useCallback(async () => {
    const streamList = getActionableStreamNames();
    setSelectedStreams([]);
    await bulkOnboardQueriesOnly(streamList);
  }, [getActionableStreamNames, bulkOnboardQueriesOnly]);

  const onOnboardStreamActionClick = async (streamName: string) => {
    await bulkScheduleOnboarding([streamName]);
  };

  const onStopOnboardingActionClick = (streamName: string) => {
    cancelOnboarding(streamName);
  };

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s" alignItems="center" wrap>
          <EuiFlexItem style={{ minWidth: 200 }}>
            <EuiSearchBar
              query={searchQuery}
              onChange={handleQueryChange}
              box={{
                incremental: true,
                'aria-label': STREAMS_TABLE_SEARCH_ARIA_LABEL,
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false} css={datePickerStyle}>
            <StreamsAppSearchBar showDatePicker enableDateRangePicker />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <GenerateSplitButton
              config={onboardingConfig}
              allConnectors={allConnectors}
              connectorError={connectorError}
              featuresResolvedConnectorId={featuresConnectors.resolvedConnectorId}
              queriesResolvedConnectorId={queriesConnectors.resolvedConnectorId}
              onConfigChange={setOnboardingConfig}
              onRun={onBulkOnboardStreamsClick}
              onRunFeaturesOnly={onBulkOnboardFeaturesOnly}
              onRunQueriesOnly={onBulkOnboardQueriesOnly}
              isRunDisabled={
                selectedStreams.length === 0 ||
                isConnectorCatalogUnavailable ||
                featuresConnectors.loading ||
                queriesConnectors.loading ||
                isScheduling
              }
              isConfigDisabled={selectedStreams.length === 0}
              isLoading={isScheduling}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <FindSignificantEventsButton
              onRun={handleRun}
              onCancel={handleCancel}
              isRunning={isRunning}
              isCanceling={isCanceling}
              isDisabled={isRunning}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiText size="s">
          {i18n.translate(
            'xpack.streams.significantEventsDiscovery.streamsTree.streamsCountLabel',
            {
              defaultMessage: '{count} streams',
              values: { count: filteredStreams?.length ?? 0 },
            }
          )}
        </EuiText>
      </EuiFlexItem>

      <EuiFlexItem>
        <StreamsTreeTable
          streams={filteredStreams}
          streamOnboardingResultMap={streamStatusMap}
          loading={isStreamsLoading}
          searchQuery={searchQuery}
          selection={{
            selected: selectedStreams,
            onSelectionChange: setSelectedStreams,
            selectable: (row) => isStreamActionable(row.stream.name),
          }}
          onOnboardStreamActionClick={onOnboardStreamActionClick}
          onStopOnboardingActionClick={onStopOnboardingActionClick}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
