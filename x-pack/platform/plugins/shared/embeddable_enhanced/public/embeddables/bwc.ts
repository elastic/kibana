/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { DynamicActionsSerializedState } from './types';

// Temporary work around - REST APIs use DrilldownState but client still uses EnhancementsState
// Remove when client code supports DrilldownState

export function extractEnhancements(state: DynamicActionsSerializedState) {
  if (!state.drilldowns || !state.drilldowns.length) {
    return {};
  }

  return {
    dynamicActions: {
      events: state.drilldowns
        .map((drilldown) => {
          if (drilldown.config.type === 'dashboard_drilldown') {
            const { dashboard_id, open_in_new_tab, use_filters, use_time_range } =
              drilldown.config as unknown as {
                dashboard_id: string;
                open_in_new_tab?: boolean;
                use_filters?: boolean;
                use_time_range?: boolean;
              };
            return {
              action: {
                config: {
                  dashboardId: dashboard_id,
                  openInNewTab: open_in_new_tab ?? false,
                  useCurrentDateRange: use_time_range ?? true,
                  useCurrentFilters: use_filters ?? true,
                },
                factoryId: 'DASHBOARD_TO_DASHBOARD_DRILLDOWN',
                name: drilldown.label ?? '',
              },
              eventId: uuidv4(),
              triggers: drilldown.triggers,
            };
          }

          if (drilldown.config.type === 'discover_drilldown') {
            const { open_in_new_tab } = drilldown.config as unknown as {
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
              triggers: drilldown.triggers,
            };
          }

          if (drilldown.config.type === 'url_drilldown') {
            const { encode_url, open_in_new_tab, url } = drilldown.config as unknown as {
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
              triggers: drilldown.triggers,
            };
          }
        })
        .filter((event) => event !== undefined),
    },
  };
}
