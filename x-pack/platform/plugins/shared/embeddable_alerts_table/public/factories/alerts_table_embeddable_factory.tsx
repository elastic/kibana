/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { ReactEmbeddableFactory } from '@kbn/embeddable-plugin/public';
import {
  initializeTimeRange,
  initializeTitleManager,
  useFetchContext,
} from '@kbn/presentation-publishing';
import { AlertsTable } from '@kbn/response-ops-alerts-table';
import { AlertActionsCell } from '@kbn/response-ops-alerts-table/components/alert_actions_cell';
import { getTime } from '@kbn/data-plugin/common';
import { ALERT_TIME_RANGE, TIMESTAMP } from '@kbn/rule-data-utils';
import { BehaviorSubject } from 'rxjs';
import type { EmbeddableAlertsTablePublicStartDependencies } from '../types';
import { EMBEDDABLE_ALERTS_TABLE_ID, LOCAL_STORAGE_KEY_PREFIX } from '../constants';
import type {
  EmbeddableAlertsTableApi,
  EmbeddableAlertsTableRuntimeState,
  EmbeddableAlertsTableSerializedState,
} from '../types';

export const getAlertsTableEmbeddableFactory = (
  core: CoreStart,
  deps: EmbeddableAlertsTablePublicStartDependencies
): ReactEmbeddableFactory<
  EmbeddableAlertsTableSerializedState,
  EmbeddableAlertsTableRuntimeState,
  EmbeddableAlertsTableApi
> => ({
  type: EMBEDDABLE_ALERTS_TABLE_ID,
  deserializeState: (state) => {
    return state.rawState;
  },
  buildEmbeddable: async (state, buildApi, uuid) => {
    const timeRange = initializeTimeRange(state);
    const titleManager = initializeTitleManager(state);
    const queryLoading$ = new BehaviorSubject<boolean | undefined>(true);
    const { data, fieldFormats, licensing } = deps;
    const { http, application, notifications, settings } = core;
    const api = buildApi(
      {
        ...timeRange.api,
        ...titleManager.api,
        dataLoading$: queryLoading$,
        serializeState: () => {
          return {
            rawState: { ...titleManager.serialize(), ...timeRange.serialize() },
          };
        },
      },
      { ...titleManager.comparators, ...timeRange.comparators }
    );

    return {
      api,
      Component: () => {
        const { timeRange: selectedTimeRange } = useFetchContext(api);

        return (
          <AlertsTable
            id={`${LOCAL_STORAGE_KEY_PREFIX}-${uuid}`}
            // Showing es query alerts for testing purposes
            // This will be replaced by the actual filters chosen by the user at creation time
            ruleTypeIds={['.es-query']}
            query={
              // Inlined time range bool query for testing purposes
              // This will be moved to a dedicated function to combine all filters
              selectedTimeRange
                ? {
                    bool: {
                      minimum_should_match: 1,
                      should: [
                        getTime(undefined, selectedTimeRange, {
                          fieldName: ALERT_TIME_RANGE,
                        })!.query,
                        getTime(undefined, selectedTimeRange, {
                          fieldName: TIMESTAMP,
                        })!.query,
                      ],
                    },
                  }
                : {}
            }
            showAlertStatusWithFlapping
            renderActionsCell={AlertActionsCell}
            toolbarVisibility={{
              // Disabling the fullscreen selector since Dashboard panels
              // can be maximized on their own
              showFullScreenSelector: false,
            }}
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
