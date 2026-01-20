/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState, useCallback } from 'react';
import { Streams } from '@kbn/streams-schema';
import { useHistory } from 'react-router-dom';
import type {
  DatasetQualityDetailsController,
  DatasetQualityView,
} from '@kbn/dataset-quality-plugin/public/controller/dataset_quality_details';
import { DEFAULT_DATEPICKER_REFRESH } from '@kbn/dataset-quality-plugin/common';
import { STREAMS_APP_LOCATOR_ID } from '@kbn/deeplinks-observability';
import {
  getDatasetQualityDetailsStateFromUrl,
  updateUrlFromDatasetQualityDetailsState,
} from '../util/url_state_storage_service';
import { useKibana } from './use_kibana';
import { useKbnUrlStateStorageFromRouterContext } from '../util/kbn_url_state_context';
import type { StreamsAppLocatorParams } from '../../common/locators/streams_locator';
import { useTimeRange } from './use_time_range';

export const useDatasetQualityController = (
  definition: Streams.ingest.all.GetResponse,
  saveStateInUrl: boolean = true,
  refreshDefinition?: () => void
): DatasetQualityDetailsController | undefined => {
  const {
    datasetQuality,
    streams: { streamsRepositoryClient },
    share: {
      url: { locators },
    },
  } = useKibana().dependencies.start;
  const {
    core: {
      notifications: { toasts },
    },
  } = useKibana();
  const [controller, setController] = useState<DatasetQualityDetailsController>();
  const urlStateStorageContainer = useKbnUrlStateStorageFromRouterContext();

  const history = useHistory();
  const { rangeFrom, rangeTo } = useTimeRange();

  // Function to update time in URL - reads current URL state to avoid stale closures
  const setTime = useCallback(
    (time: { from: string; to: string }) => {
      // Read current URL state to ensure we don't lose other params (like pageState)
      const searchParams = new URLSearchParams(history.location.search);

      // Don't update if time is the same to avoid infinite loops
      if (searchParams.get('rangeFrom') === time.from && searchParams.get('rangeTo') === time.to) {
        return;
      }

      searchParams.set('rangeFrom', time.from);
      searchParams.set('rangeTo', time.to);

      history.replace({
        ...history.location,
        search: searchParams.toString(),
      });
    },
    [history]
  );

  const streamsUrls = useMemo(() => {
    const streamsLocator = locators.get<StreamsAppLocatorParams>(STREAMS_APP_LOCATOR_ID);
    if (!streamsLocator) {
      return undefined;
    }

    const streamName = definition.stream.name;
    return {
      processingUrl: streamsLocator.getRedirectUrl({
        name: streamName,
        managementTab: 'processing',
      } as StreamsAppLocatorParams),
      schemaUrl: streamsLocator.getRedirectUrl({
        name: streamName,
        managementTab: 'schema',
      } as StreamsAppLocatorParams),
    };
  }, [locators, definition.stream.name]);

  useEffect(() => {
    async function getDatasetQualityDetailsController() {
      let initialState = getDatasetQualityDetailsStateFromUrl({
        urlStateStorageContainer,
        toastsService: toasts,
      });

      // state initialization is under progress
      if (initialState === undefined) {
        return;
      }

      // Use time from URL params (rangeFrom/rangeTo) as the source of truth
      // This ensures consistency across tabs within the Streams app.
      const currentTimeFrom = rangeFrom ?? 'now-15m';
      const currentTimeTo = rangeTo ?? 'now';

      // state initialized but empty
      if (initialState === null) {
        initialState = {
          dataStream: definition.stream.name,
          view: (Streams.WiredStream.Definition.is(definition.stream)
            ? 'wired'
            : 'classic') as DatasetQualityView,
          timeRange: {
            from: currentTimeFrom,
            to: currentTimeTo,
            refresh: DEFAULT_DATEPICKER_REFRESH,
          },
          streamDefinition: definition,
        };
      } else {
        // The pageState may have stale time values from a previous visit,
        // so always override with the URL time params.
        initialState = {
          ...initialState,
          timeRange: {
            from: currentTimeFrom,
            to: currentTimeTo,
            refresh: initialState.timeRange?.refresh ?? DEFAULT_DATEPICKER_REFRESH,
          },
        };
      }

      const datasetQualityDetailsController =
        await datasetQuality.createDatasetQualityDetailsController({
          initialState: {
            ...initialState,
            view: (Streams.WiredStream.Definition.is(definition.stream)
              ? 'wired'
              : 'classic') as DatasetQualityView,
            streamDefinition: definition,
            streamsUrls,
          },
          streamsRepositoryClient,
          refreshDefinition,
        });
      datasetQualityDetailsController.service.start();

      setController(datasetQualityDetailsController);

      if (!saveStateInUrl) {
        return () => {
          datasetQualityDetailsController.service.stop();
        };
      }

      const datasetQualityStateSubscription = datasetQualityDetailsController.state$.subscribe(
        (state) => {
          updateUrlFromDatasetQualityDetailsState({
            urlStateStorageContainer,
            datasetQualityDetailsState: state,
            setTime,
          });
        }
      );

      return () => {
        datasetQualityDetailsController.service.stop();
        datasetQualityStateSubscription.unsubscribe();
      };
    }

    getDatasetQualityDetailsController();
  }, [
    datasetQuality,
    history,
    toasts,
    urlStateStorageContainer,
    definition,
    saveStateInUrl,
    rangeFrom,
    rangeTo,
    setTime,
    streamsRepositoryClient,
    refreshDefinition,
    streamsUrls,
  ]);

  return controller;
};
