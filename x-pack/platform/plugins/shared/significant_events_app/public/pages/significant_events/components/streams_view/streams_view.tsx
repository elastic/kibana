/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFieldSearch, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KIS_ONBOARDING_IN_PROGRESS_STATUSES } from '@kbn/significant-events-schema';
import React, { useCallback, useMemo, useState } from 'react';
import type { TableRow } from './utils';
import { parseSearchQuery } from './utils';
import { useAIFeatures } from '../../../../hooks/use_ai_features';
import { useSignificantEventsPageContext } from '../../context/significant_events_page_context';
import type { SignificantEventsSearchBarProps } from '../../../../components/search_bar';
import { SignificantEventsSearchBar } from '../../../../components/search_bar';
import { useBlocksNewActivity } from '../../../../hooks/use_significant_events_maintenance';
import { useKiGeneration } from '../knowledge_indicators_table/ki_generation_context';
import { GenerateSplitButton } from '../shared/generate_split_button';
import { FindSignificantEventsButton } from './find_significant_events_button';
import { STREAMS_TABLE_SEARCH_ARIA_LABEL } from './translations';
import { StreamsTreeTable } from './tree_table';

export function StreamsView({ compact = false }: { compact?: boolean }) {
  const { blocksActivity, activityBlockTooltip } = useBlocksNewActivity();
  const [searchText, setSearchText] = useState('');

  const searchQuery = useMemo(() => parseSearchQuery(searchText), [searchText]);

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

  const { isRunning, isCanceling, handleRun, handleCancel } = useSignificantEventsPageContext();

  const isStreamActionable = useCallback(
    (streamName: string) => {
      if (generatingStreamNames.includes(streamName)) return false;
      const result = streamStatusMap[streamName];
      return !!result && !KIS_ONBOARDING_IN_PROGRESS_STATUSES.has(result.status);
    },
    [generatingStreamNames, streamStatusMap]
  );

  const [selectedStreams, setSelectedStreams] = useState<TableRow[]>([]);

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

  const handleQueryChange: SignificantEventsSearchBarProps['onQueryChange'] = (queryPayload) => {
    setSearchText(String(queryPayload.query?.query ?? ''));
  };

  const generateButton = (
    <GenerateSplitButton
      size="s"
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
        blocksActivity ||
        selectedStreams.length === 0 ||
        isConnectorCatalogUnavailable ||
        featuresConnectors.loading ||
        queriesConnectors.loading ||
        isScheduling
      }
      runDisabledTooltip={activityBlockTooltip}
      isConfigDisabled={selectedStreams.length === 0}
      isLoading={isScheduling}
    />
  );

  const findButton = (
    <FindSignificantEventsButton
      onRun={handleRun}
      onCancel={handleCancel}
      isRunning={isRunning}
      isCanceling={isCanceling}
      isDisabled={isRunning || blocksActivity}
      disabledTooltip={activityBlockTooltip}
    />
  );

  const streamsCount = (
    <EuiText size="s" color="subdued">
      {i18n.translate('xpack.significantEventsApp.streamsTree.streamsCountLabel', {
        defaultMessage: '{count} streams',
        values: { count: filteredStreams?.length ?? 0 },
      })}
    </EuiText>
  );

  const table = (
    <StreamsTreeTable
      streams={filteredStreams}
      streamOnboardingResultMap={streamStatusMap}
      loading={isStreamsLoading}
      searchQuery={searchQuery}
      compact={compact}
      blocksActivity={blocksActivity}
      activityBlockTooltip={activityBlockTooltip}
      selection={{
        selected: selectedStreams,
        onSelectionChange: setSelectedStreams,
        selectable: (row) => isStreamActionable(row.stream.name),
      }}
      onOnboardStreamActionClick={onOnboardStreamActionClick}
      onStopOnboardingActionClick={onStopOnboardingActionClick}
    />
  );

  // Flyout layout: simple search field + generate action (matches KI toolbar / cases patterns).
  // Avoid the full unified search bar with date picker — it does not fit constrained flyouts.
  if (compact) {
    return (
      <EuiFlexGroup direction="column" gutterSize="m" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow>
              <EuiFieldSearch
                incremental
                fullWidth
                compressed
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder={STREAMS_TABLE_SEARCH_ARIA_LABEL}
                aria-label={STREAMS_TABLE_SEARCH_ARIA_LABEL}
                data-test-subj="streamsStatusFlyoutSearch"
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>{generateButton}</EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{streamsCount}</EuiFlexItem>
        <EuiFlexItem grow={false}>{table}</EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s" alignItems="center" wrap>
          <EuiFlexItem grow style={{ minWidth: 200 }}>
            <SignificantEventsSearchBar
              onQuerySubmit={handleQueryChange}
              onQueryChange={handleQueryChange}
              placeholder={STREAMS_TABLE_SEARCH_ARIA_LABEL}
              query={{
                query: searchText,
                language: 'text',
              }}
              showDatePicker
              showQueryInput
              enableDateRangePicker
              submitButtonStyle="iconOnly"
              isClearable
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>{generateButton}</EuiFlexItem>
          <EuiFlexItem grow={false}>{findButton}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>{streamsCount}</EuiFlexItem>

      <EuiFlexItem>{table}</EuiFlexItem>
    </EuiFlexGroup>
  );
}
