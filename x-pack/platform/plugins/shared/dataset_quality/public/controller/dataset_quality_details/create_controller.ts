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
import type { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import { createDatasetQualityDetailsControllerStateMachine } from '../../state_machines/dataset_quality_details_controller/state_machine';
import type { DataStreamDetailsServiceStart } from '../../services/data_stream_details';
import type { DatasetQualityStartDeps } from '../../types';
import { getContextFromPublicState, getPublicStateFromContext } from './public_state';
import type {
  DatasetQualityDetailsController,
  DatasetQualityDetailsPublicStateUpdate,
} from './types';

interface Dependencies {
  core: CoreStart;
  plugins: DatasetQualityStartDeps;
  dataStreamDetailsService: DataStreamDetailsServiceStart;
}

export const createDatasetQualityDetailsControllerFactory =
  ({ core, plugins, dataStreamDetailsService }: Dependencies) =>
  async ({
    initialState,
    streamsRepositoryClient,
    refreshDefinition,
  }: {
    initialState: DatasetQualityDetailsPublicStateUpdate;
    streamsRepositoryClient?: StreamsRepositoryClient;
    refreshDefinition?: () => void;
  }): Promise<DatasetQualityDetailsController> => {
    const initialContext = getContextFromPublicState(initialState);

    const dataStreamDetailsClient = await dataStreamDetailsService.getClient();

    const machine = createDatasetQualityDetailsControllerStateMachine({
      initialContext,
      plugins,
      toasts: core.notifications.toasts,
      dataStreamDetailsClient,
      streamsRepositoryClient,
      refreshDefinition,
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

export type CreateDatasetQualityDetailsControllerFactory =
  typeof createDatasetQualityDetailsControllerFactory;
export type CreateDatasetQualityDetailsController = ReturnType<
  typeof createDatasetQualityDetailsControllerFactory
>;
