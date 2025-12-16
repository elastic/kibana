/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { niceTimeFormatter } from '@elastic/charts';
import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Streams, StreamQueryKql, Feature } from '@kbn/streams-schema';
import type { TimeRange } from '@kbn/es-query';
import { isEqual } from 'lodash';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StreamFeaturesFlyout } from '../stream_detail_features/stream_features/stream_features_flyout';
import { useStreamFeatures } from '../stream_detail_features/stream_features/hooks/use_stream_features';
import { useFilteredSigEvents } from './hooks/use_filtered_sig_events';
import { useKibana } from '../../hooks/use_kibana';
import { EditSignificantEventFlyout } from './edit_significant_event_flyout';
import { PreviewDataSparkPlot } from './add_significant_event_flyout/common/preview_data_spark_plot';
import { useFetchSignificantEvents } from '../../hooks/use_fetch_significant_events';
import { useSignificantEventsApi } from '../../hooks/use_significant_events_api';
import { useTimefilter } from '../../hooks/use_timefilter';
import { LoadingPanel } from '../loading_panel';
import type { Flow } from './add_significant_event_flyout/types';
import { SignificantEventsTable } from './significant_events_table';
import { EmptyState } from './empty_state';
import { useAIFeatures } from './add_significant_event_flyout/generated_flow_form/use_ai_features';
import {
  OPEN_SIGNIFICANT_EVENTS_FLYOUT_URL_PARAM,
  SELECTED_FEATURES_URL_PARAM,
} from '../../constants';
import { useStreamFeaturesApi } from '../../hooks/use_stream_features_api';

interface Props {
  definition: Streams.all.GetResponse;
  refreshDefinition: () => void;
}

export function StreamDetailSignificantEventsView({ definition, refreshDefinition }: Props) {
  const { timeState, setTime, refresh } = useTimefilter();
  const { unifiedSearch } = useKibana().dependencies.start;

  const aiFeatures = useAIFeatures();

  const xFormatter = useMemo(() => {
    return niceTimeFormatter([timeState.start, timeState.end]);
  }, [timeState.start, timeState.end]);

  const { features, refreshFeatures, featuresLoading } = useStreamFeatures(definition.stream);
  const { identifyFeatures, abort } = useStreamFeaturesApi(definition.stream);
  const [isFeatureDetectionFlyoutOpen, setIsFeatureDetectionFlyoutOpen] = useState(false);
  const [isFeatureDetectionLoading, setIsFeatureDetectionLoading] = useState(false);
  const [detectedFeatures, setDetectedFeatures] = useState<Feature[]>([]);

  const significantEventsFetchState = useFetchSignificantEvents({
    name: definition.stream.name,
    start: timeState.start,
    end: timeState.end,
  });

  const { removeQuery } = useSignificantEventsApi({
    name: definition.stream.name,
    start: timeState.start,
    end: timeState.end,
  });
  const [isEditFlyoutOpen, setIsEditFlyoutOpen] = useState(false);
  const [initialFlow, setInitialFlow] = useState<Flow | undefined>('ai');

  const [selectedFeatures, setSelectedFeatures] = useState<Feature[]>([]);
  const [queryToEdit, setQueryToEdit] = useState<StreamQueryKql | undefined>();

  const [dateRange, setDateRange] = useState<TimeRange | undefined>(undefined);
  const [query, setQuery] = useState<string>('');

  const identifyFeaturesCallback = useCallback(() => {
    setIsFeatureDetectionLoading(true);
    setIsFeatureDetectionFlyoutOpen(true);

    identifyFeatures(aiFeatures?.genAiConnectors.selectedConnector!)
      .then((data) => {
        setDetectedFeatures(data.features);
      })
      .finally(() => {
        setIsFeatureDetectionLoading(false);
      });
  }, [
    identifyFeatures,
    aiFeatures?.genAiConnectors.selectedConnector,
    setIsFeatureDetectionLoading,
    setIsFeatureDetectionFlyoutOpen,
    setDetectedFeatures,
  ]);

  const { significantEvents, combinedQuery } = useFilteredSigEvents(
    significantEventsFetchState.value ?? [],
    query
  );

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get(OPEN_SIGNIFICANT_EVENTS_FLYOUT_URL_PARAM) === 'true' && features.length > 0) {
      setIsEditFlyoutOpen(true);

      // Parse selected features from URL parameters
      const selectedFeaturesParam = urlParams.get(SELECTED_FEATURES_URL_PARAM);

      if (selectedFeaturesParam) {
        const selectedFeatureNames = selectedFeaturesParam.split(',').filter((name) => name.trim());
        setSelectedFeatures(
          features.filter((feature) => selectedFeatureNames.includes(feature.name))
        );
      }

      // Clean up the URL parameters after opening the flyout
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete(OPEN_SIGNIFICANT_EVENTS_FLYOUT_URL_PARAM);
      newUrl.searchParams.delete(SELECTED_FEATURES_URL_PARAM);
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, [features]);

  if (
    !significantEventsFetchState.value &&
    (featuresLoading || significantEventsFetchState.loading)
  ) {
    return <LoadingPanel size="xxl" />;
  }

  const featureDetectionFlyout = isFeatureDetectionFlyoutOpen ? (
    <StreamFeaturesFlyout
      definition={definition.stream}
      features={detectedFeatures}
      isLoading={isFeatureDetectionLoading}
      closeFlyout={() => {
        abort();
        refreshFeatures();
        setIsFeatureDetectionFlyoutOpen(false);
      }}
      setFeatures={setDetectedFeatures}
    />
  ) : null;

  const editFlyout = (generateAutomatically: boolean) => (
    <EditSignificantEventFlyout
      setIsEditFlyoutOpen={setIsEditFlyoutOpen}
      isEditFlyoutOpen={isEditFlyoutOpen}
      definition={definition}
      refreshDefinition={refreshDefinition}
      refresh={significantEventsFetchState.refresh}
      queryToEdit={queryToEdit}
      setQueryToEdit={setQueryToEdit}
      initialFlow={initialFlow}
      selectedFeatures={selectedFeatures}
      setSelectedFeatures={setSelectedFeatures}
      features={features}
      generateAutomatically={generateAutomatically}
      onFeatureIdentificationClick={identifyFeaturesCallback}
    />
  );

  const noSignificantEvents =
    significantEventsFetchState.value && significantEventsFetchState.value.length === 0;

  if (noSignificantEvents) {
    return (
      <>
        <EmptyState
          features={features}
          selectedFeatures={selectedFeatures}
          onFeaturesChange={setSelectedFeatures}
          onFeatureIdentificationClick={identifyFeaturesCallback}
          onManualEntryClick={() => {
            setQueryToEdit(undefined);
            setInitialFlow('manual');
            setIsEditFlyoutOpen(true);
          }}
          onGenerateSuggestionsClick={() => {
            setInitialFlow('ai');
            setIsEditFlyoutOpen(true);
          }}
        />
        {featureDetectionFlyout}
        {editFlyout(true)}
      </>
    );
  }

  return (
    <>
      <EuiFlexGroup direction="column" gutterSize="l">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup direction="row" gutterSize="s">
            <EuiFlexItem grow>
              <unifiedSearch.ui.SearchBar
                appName="streamsApp"
                showFilterBar={false}
                showQueryMenu={false}
                showQueryInput={true}
                submitButtonStyle="iconOnly"
                displayStyle="inPage"
                disableQueryLanguageSwitcher
                onQuerySubmit={(queryN) => {
                  setQuery(String(queryN.query?.query ?? ''));

                  if (isEqual(queryN.dateRange, dateRange)) {
                    refresh();
                  } else {
                    setTime(queryN.dateRange);
                    setDateRange(queryN.dateRange);
                  }
                }}
                onQueryChange={(queryN) => {
                  setQuery(String(queryN.query?.query ?? ''));
                }}
                query={{
                  query,
                  language: 'text',
                }}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                fill={true}
                size="s"
                color="primary"
                onClick={() => {
                  setIsEditFlyoutOpen(true);
                  setQueryToEdit(undefined);
                }}
                iconType="plus"
                data-test-subj="significant_events_existing_queries_open_flyout_button"
              >
                {i18n.translate('xpack.streams.significantEvents.addSignificantEventButton', {
                  defaultMessage: 'Significant events',
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <PreviewDataSparkPlot
            definition={definition.stream}
            query={{ kql: { query: combinedQuery ?? '' }, id: 'preview_all', title: 'All events' }}
            isQueryValid={true}
            noOfBuckets={50}
          />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <SignificantEventsTable
            loading={significantEventsFetchState.loading}
            definition={definition.stream}
            items={significantEvents}
            onEditClick={(item) => {
              setIsEditFlyoutOpen(true);
              setQueryToEdit({ ...item.query });
            }}
            onDeleteClick={async (item) => {
              await removeQuery?.(item.query.id).then(() => {
                significantEventsFetchState.refresh();
              });
            }}
            xFormatter={xFormatter}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      {featureDetectionFlyout}
      {editFlyout(false)}
    </>
  );
}
