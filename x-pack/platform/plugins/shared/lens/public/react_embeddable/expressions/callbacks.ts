/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaExecutionContext } from '@kbn/core/public';
import type { DefaultInspectorAdapters } from '@kbn/expressions-plugin/common';
import { apiHasDisableTriggers } from '@kbn/presentation-publishing';
import type {
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

      if (api.isTextBasedLanguage() && adapters?.tables?.tables) {
        const table = adapters.tables.tables[0];
        if (table && table.columns.length > 2) {
          const dateColumns = table.columns.filter((c) => c.meta.type === 'date');
          const numberColumns = table.columns.filter((c) => c.meta.type === 'number');
          const stringColumns = table.columns.filter((c) => c.meta.type === 'string');

          if (dateColumns.length === 1 && numberColumns.length === 1 && stringColumns.length >= 2) {
            const newColumnName = stringColumns.map((c) => c.name).join(' > ');
            const stringColumnNames = stringColumns.map((c) => c.name);

            table.rows = table.rows.map((row) => {
              const newRow = { ...row };
              newRow[newColumnName] = stringColumnNames
                .map((name) => row[name] ?? '(empty)')
                .join(' > ');
              stringColumnNames.forEach((name) => {
                delete newRow[name];
              });
              return newRow;
            });

            table.columns = [
              ...dateColumns,
              ...numberColumns,
              {
                id: newColumnName,
                name: newColumnName,
                meta: { type: 'string', esqlType: 'keyword' },
              },
            ];
          }
        }
      }

      onDataUpdate(adapters);
    },
    handleEvent: prepareEventHandler(api, getState, callbacks, services, disableTriggers),
  };
}
