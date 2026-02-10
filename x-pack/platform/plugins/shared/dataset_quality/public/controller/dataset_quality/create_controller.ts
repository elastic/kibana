/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import { createConsoleInspector } from '@kbn/xstate-utils';
import equal from 'fast-deep-equal';
import { distinctUntilChanged, from, map } from 'rxjs';
import { createActor } from 'xstate';
import { DATASET_QUALITY_ALL_SIGNALS_ID } from '../../../common/constants';
import type { DataStreamsStatsServiceStart } from '../../services/data_streams_stats';
import {
  createDatasetQualityControllerStateMachine,
  DEFAULT_CONTEXT,
} from '../../state_machines/dataset_quality_controller';
import { getContextFromPublicState, getPublicStateFromContext } from './public_state';
import type { DatasetQualityController, DatasetQualityPublicStateUpdate } from './types';

type InitialState = DatasetQualityPublicStateUpdate;

interface Dependencies {
  core: CoreStart;
  dataStreamStatsService: DataStreamsStatsServiceStart;
}

export const createDatasetQualityControllerFactory =
  ({ core, dataStreamStatsService }: Dependencies) =>
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
      isDatasetQualityAllSignalsAvailable: core.pricing.isFeatureAvailable(
        DATASET_QUALITY_ALL_SIGNALS_ID
      ),
    });

    const service = createActor(machine, {
      inspect: createConsoleInspector(),
    });

    const state$ = from(service).pipe(
      map((snapshot) => getPublicStateFromContext(snapshot.context)),
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
