/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { DynamicActionsSerializedState } from './types';

//
// Temporary work around - REST APIs use DrilldownState but client still uses EnhancementsState
// Remove when client code supports DrilldownState
//

export function extractEnhancements(state: DynamicActionsSerializedState) {
  if (!state.drilldowns || !state.drilldowns.length) {
    return {};
  }

  return {
    dynamicActions: {
      events: state.drilldowns
        .map((drilldown) => {
          if (drilldown.type === 'dashboard_drilldown') {
            const { dashboard_id, open_in_new_tab, use_filters, use_time_range } =
              drilldown as unknown as {
                dashboard_id: string;
                open_in_new_tab?: boolean;
                use_filters?: boolean;
                use_time_range?: boolean;
              };
            return {
              action: {
                config: {
                  dashboardId: dashboard_id,
                  open_in_new_tab: open_in_new_tab ?? false,
                  use_time_range: use_time_range ?? true,
                  use_filters: use_filters ?? true,
                },
                factoryId: 'DASHBOARD_TO_DASHBOARD_DRILLDOWN',
                name: drilldown.label ?? '',
              },
              eventId: uuidv4(),
              triggers: [drilldown.trigger],
            };
          }

          if (drilldown.type === 'discover_drilldown') {
            const { open_in_new_tab } = drilldown as unknown as {
              open_in_new_tab?: boolean;
            };
            return {
              action: {
                config: {
                  openInNewTab: open_in_new_tab ?? false,
                },
                factoryId: 'OPEN_IN_DISCOVER_DRILLDOWN',
                name: drilldown.label ?? '',
              },
              eventId: uuidv4(),
              triggers: [drilldown.trigger],
            };
          }

          if (drilldown.type === 'url_drilldown') {
            const { encode_url, open_in_new_tab, url } = drilldown as unknown as {
              encode_url?: boolean;
              open_in_new_tab?: boolean;
              url: string;
            };
            return {
              action: {
                config: {
                  encodeUrl: encode_url ?? true,
                  openInNewTab: open_in_new_tab ?? false,
                  url: {
                    template: url,
                  },
                },
                factoryId: 'URL_DRILLDOWN',
                name: drilldown.label ?? '',
              },
              eventId: uuidv4(),
              triggers: [drilldown.trigger],
            };
          }
        })
        .filter((event) => event !== undefined),
    },
  };
}

export function serializeEnhancements(enhancements: DynamicActionsSerializedState['enhancements']) {
  if (!enhancements?.dynamicActions?.events.length) {
    return {};
  }

  const drilldowns = enhancements.dynamicActions.events
    .map((event) => {
      if (event.action.factoryId === 'DASHBOARD_TO_DASHBOARD_DRILLDOWN') {
        const { dashboardId, openInNewTab, useCurrentDateRange, useCurrentFilters } =
          event.action.config;
        return {
          dashboard_id: dashboardId,
          label: event.action.name,
          open_in_new_tab: openInNewTab ?? false,
          trigger: event.triggers[0] ?? 'unknown',
          type: 'dashboard_drilldown',
          use_time_range: useCurrentDateRange ?? true,
          use_filters: useCurrentFilters ?? true,
        };
      }

      if (event.action.factoryId === 'OPEN_IN_DISCOVER_DRILLDOWN') {
        const { openInNewTab } = event.action.config;
        return {
          label: event.action.name,
          open_in_new_tab: openInNewTab ?? false,
          trigger: event.triggers[0] ?? 'unknown',
          type: 'discover_drilldown',
        };
      }

      if (event.action.factoryId === 'URL_DRILLDOWN') {
        const { encodeUrl, openInNewTab, url } = event.action.config as {
          encodeUrl?: boolean;
          openInNewTab?: boolean;
          url?: { template?: string };
        };
        return {
          label: event.action.name,
          encode_url: encodeUrl ?? true,
          open_in_new_tab: openInNewTab ?? true,
          trigger: event.triggers[0] ?? 'unknown',
          type: 'url_drilldown',
          url: url?.template ?? '',
        };
      }
    })
    .filter((drilldown) => drilldown !== undefined);

  return drilldowns.length ? { drilldowns } : {};
}
