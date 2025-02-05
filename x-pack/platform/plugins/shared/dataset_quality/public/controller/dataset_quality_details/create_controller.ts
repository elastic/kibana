/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core/public';
import { getDevToolsOptions } from '@kbn/xstate-utils';
import equal from 'fast-deep-equal';
import { distinctUntilChanged, from, map } from 'rxjs';
import { interpret } from 'xstate';
import { createDatasetQualityDetailsControllerStateMachine } from '../../state_machines/dataset_quality_details_controller/state_machine';
import { DataStreamsStatsServiceStart } from '../../services/data_streams_stats';
import { DataStreamDetailsServiceStart } from '../../services/data_stream_details';
import { DatasetQualityStartDeps } from '../../types';
import { getContextFromPublicState, getPublicStateFromContext } from './public_state';
import { DatasetQualityDetailsController, DatasetQualityDetailsPublicStateUpdate } from './types';

interface Dependencies {
  core: CoreStart;
  plugins: DatasetQualityStartDeps;
  dataStreamStatsService: DataStreamsStatsServiceStart;
  dataStreamDetailsService: DataStreamDetailsServiceStart;
  isFailureStoreEnabled: boolean;
}

export const createDatasetQualityDetailsControllerFactory =
  ({
    core,
    plugins,
    dataStreamStatsService,
    dataStreamDetailsService,
    isFailureStoreEnabled,
  }: Dependencies) =>
  async ({
    initialState,
  }: {
    initialState: DatasetQualityDetailsPublicStateUpdate;
  }): Promise<DatasetQualityDetailsController> => {
    const initialContext = getContextFromPublicState(initialState);

    const [dataStreamStatsClient, dataStreamDetailsClient] = await Promise.all([
      dataStreamStatsService.getClient(),
      dataStreamDetailsService.getClient(),
    ]);

    const machine = createDatasetQualityDetailsControllerStateMachine({
      initialContext,
      plugins,
      toasts: core.notifications.toasts,
      dataStreamStatsClient,
      dataStreamDetailsClient,
      isFailureStoreEnabled,
    });

    const service = interpret(machine, {
      devTools: getDevToolsOptions(),
    });

    const state$ = from(service).pipe(
      map(({ context }) => getPublicStateFromContext(context)),
      distinctUntilChanged(equal)
    );

    return {
      state$,
      service,
    };
  };

export type CreateDatasetQualityDetailsControllerFactory =
  typeof createDatasetQualityDetailsControllerFactory;
export type CreateDatasetQualityDetailsController = ReturnType<
  typeof createDatasetQualityDetailsControllerFactory
>;
