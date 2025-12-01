/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { Streams } from '@kbn/streams-schema';
import { useHistory } from 'react-router-dom';
import type {
  DatasetQualityDetailsController,
  DatasetQualityView,
} from '@kbn/dataset-quality-plugin/public/controller/dataset_quality_details';
import { DEFAULT_DATEPICKER_REFRESH } from '@kbn/dataset-quality-plugin/common';
import {
  getDatasetQualityDetailsStateFromUrl,
  updateUrlFromDatasetQualityDetailsState,
} from '../util/url_state_storage_service';
import { useKibana } from './use_kibana';
import { useTimefilter } from './use_timefilter';
import { useKbnUrlStateStorageFromRouterContext } from '../util/kbn_url_state_context';

export const useDatasetQualityController = (
  definition: Streams.ingest.all.GetResponse,
  saveStateInUrl: boolean = true
): DatasetQualityDetailsController | undefined => {
  const { datasetQuality } = useKibana().dependencies.start;
  const {
    core: {
      notifications: { toasts },
    },
  } = useKibana();
  const [controller, setController] = useState<DatasetQualityDetailsController>();
  const urlStateStorageContainer = useKbnUrlStateStorageFromRouterContext();

  const history = useHistory();
  const { timeState, setTime } = useTimefilter();

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

      // state initialized but empty
      if (initialState === null) {
        initialState = {
          dataStream: definition.stream.name,
          view: (Streams.WiredStream.Definition.is(definition.stream)
            ? 'wired'
            : 'classic') as DatasetQualityView,
          timeRange: {
            from: timeState.timeRange.from,
            to: timeState.timeRange.to,
            refresh: DEFAULT_DATEPICKER_REFRESH,
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
          },
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
    definition.stream.name,
    saveStateInUrl,
    definition.stream,
    timeState.timeRange.from,
    timeState.timeRange.to,
    setTime,
  ]);

  return controller;
};
