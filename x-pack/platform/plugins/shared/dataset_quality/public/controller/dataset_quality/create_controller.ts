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
import { DataStreamsStatsServiceStart } from '../../services/data_streams_stats';
import {
  createDatasetQualityControllerStateMachine,
  DEFAULT_CONTEXT,
} from '../../state_machines/dataset_quality_controller';
import { getContextFromPublicState, getPublicStateFromContext } from './public_state';
import { DatasetQualityController, DatasetQualityPublicStateUpdate } from './types';

type InitialState = DatasetQualityPublicStateUpdate;

interface Dependencies {
  core: CoreStart;
  dataStreamStatsService: DataStreamsStatsServiceStart;
  isFailureStoreEnabled: boolean;
}

export const createDatasetQualityControllerFactory =
  ({ core, dataStreamStatsService, isFailureStoreEnabled }: Dependencies) =>
  async ({
    initialState = DEFAULT_CONTEXT,
  }: {
    initialState?: InitialState;
  }): Promise<DatasetQualityController> => {
    const initialContext = getContextFromPublicState(initialState ?? {});

    const dataStreamStatsClient = await dataStreamStatsService.getClient();

    const machine = createDatasetQualityControllerStateMachine({
      initialContext,
      toasts: core.notifications.toasts,
      dataStreamStatsClient,
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

export type CreateDatasetQualityControllerFactory = typeof createDatasetQualityControllerFactory;
export type CreateDatasetQualityController = ReturnType<
  typeof createDatasetQualityControllerFactory
>;
