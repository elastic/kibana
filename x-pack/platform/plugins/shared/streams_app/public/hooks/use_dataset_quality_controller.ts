/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';
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
import { useTimefilter } from './use_timefilter';
import { useKbnUrlStateStorageFromRouterContext } from '../util/kbn_url_state_context';
import type { StreamsAppLocatorParams } from '../../common/locators/streams_locator';

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
    data: { query: queryService },
  } = useKibana().dependencies.start;
  const {
    core: {
      notifications: { toasts },
    },
  } = useKibana();
  const [controller, setController] = useState<DatasetQualityDetailsController>();
  const urlStateStorageContainer = useKbnUrlStateStorageFromRouterContext();

  const history = useHistory();
  const { timeState, setTime } = useTimefilter();

  // Get timefilter directly from service for synchronous access to current time
  // The hook's timeState may be stale on first render due to observable timing
  const timefilter = queryService.timefilter.timefilter;

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

      // Always use the current global timefilter state to ensure consistency
      // across tabs (Retention, Data Quality, etc.) within the Streams app.
      // We read directly from the timefilter service (not the hook's reactive state)
      // to get the most up-to-date time synchronously, avoiding race conditions
      // where the hook's state might be stale on first render.
      const currentTime = timefilter.getTime();

      // state initialized but empty
      if (initialState === null) {
        initialState = {
          dataStream: definition.stream.name,
          view: (Streams.WiredStream.Definition.is(definition.stream)
            ? 'wired'
            : 'classic') as DatasetQualityView,
          timeRange: {
            from: currentTime.from,
            to: currentTime.to,
            refresh: DEFAULT_DATEPICKER_REFRESH,
          },
          streamDefinition: definition,
        };
      } else {
        // The pageState may have stale time values from a previous visit,
        // so always override with the current global timefilter time.
        initialState = {
          ...initialState,
          timeRange: {
            from: currentTime.from,
            to: currentTime.to,
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
    timefilter,
    timeState.timeRange.from,
    timeState.timeRange.to,
    setTime,
    streamsRepositoryClient,
    refreshDefinition,
    streamsUrls,
  ]);

  return controller;
};
