/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaExecutionContext } from '@kbn/core/public';
import type { DefaultInspectorAdapters } from '@kbn/expressions-plugin/common';
import { apiHasDisableTriggers } from '@kbn/presentation-publishing';
import {
  GetStateType,
  LensApi,
  LensEmbeddableStartServices,
  LensInternalApi,
  LensPublicCallbacks,
} from '../types';
import { prepareOnRender } from './on_render';
import { prepareEventHandler } from './on_event';
import { addLog } from '../logger';

export function prepareCallbacks(
  api: LensApi,
  internalApi: LensInternalApi,
  parentApi: unknown,
  getState: GetStateType,
  services: LensEmbeddableStartServices,
  executionContext: KibanaExecutionContext | undefined,
  onDataUpdate: (adapters: Partial<DefaultInspectorAdapters | undefined>) => void,
  dispatchRenderComplete: () => void,
  callbacks: LensPublicCallbacks
) {
  const disableTriggers = apiHasDisableTriggers(parentApi) ? parentApi.disableTriggers : undefined;
  return {
    disableTriggers,
    onRender: prepareOnRender(
      api,
      internalApi,
      parentApi,
      getState,
      services,
      executionContext,
      dispatchRenderComplete
    ),
    onData: (_data: unknown, adapters: Partial<DefaultInspectorAdapters> | undefined) => {
      addLog(`onData$`);
      onDataUpdate(adapters);
    },
    handleEvent: prepareEventHandler(api, getState, callbacks, services, disableTriggers),
  };
}
