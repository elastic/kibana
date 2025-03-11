/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { CoreStart } from '@kbn/core-lifecycle-browser';
import { ReactEmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { initializeTimeRange, initializeTitleManager } from '@kbn/presentation-publishing';
import { BehaviorSubject } from 'rxjs';
import { AlertsTable } from '@kbn/response-ops-alerts-table';
import { AlertActionsCell } from '@kbn/response-ops-alerts-table/components/alert_actions_cell';
import { StartDependencies } from './types';
import { EMBEDDABLE_ALERTS_TABLE_ID } from './constants';
import {
  EmbeddableAlertsTableApi,
  EmbeddableAlertsTableRuntimeState,
  EmbeddableAlertsTableSerializedState,
} from './types';

export const getAlertsTableFactory = (
  core: CoreStart,
  deps: StartDependencies
): ReactEmbeddableFactory<
  EmbeddableAlertsTableSerializedState,
  EmbeddableAlertsTableRuntimeState,
  EmbeddableAlertsTableApi
> => ({
  type: EMBEDDABLE_ALERTS_TABLE_ID,
  deserializeState: (state) => {
    return state.rawState as EmbeddableAlertsTableSerializedState;
  },
  buildEmbeddable: async (state, buildApi, uuid) => {
    const timeRange = initializeTimeRange(state);
    const queryLoading$ = new BehaviorSubject<boolean | undefined>(true);
    const {
      api: titlesApi,
      comparators: titleComparators,
      serialize: serializeTitles,
    } = initializeTitleManager(state);
    const { data, fieldFormats, licensing } = deps;
    const { http, application, notifications, settings } = core;
    const api = buildApi(
      {
        ...timeRange.api,
        ...titlesApi,
        dataLoading$: queryLoading$,
        serializeState: () => {
          return {
            rawState: { ...serializeTitles(), ...timeRange.serialize() },
          };
        },
      },
      { ...titleComparators, ...timeRange.comparators }
    );

    return {
      api,
      Component: () => {
        return (
          <AlertsTable
            id={`embeddable-alerts-table-${uuid}`}
            // Showing es query alerts for testing purposes
            // This will be replaced by the actual filters chosen by the user at creation time
            ruleTypeIds={['.es-query']}
            query={{}}
            showAlertStatusWithFlapping
            renderActionsCell={AlertActionsCell}
            services={{
              data,
              http,
              notifications,
              fieldFormats,
              application,
              licensing,
              settings,
            }}
          />
        );
      },
    };
  },
});
