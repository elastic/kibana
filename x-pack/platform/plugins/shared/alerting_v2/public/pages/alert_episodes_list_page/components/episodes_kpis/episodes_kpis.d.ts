import React from 'react';
import type { TimeRange } from '@kbn/es-query';
import type { EpisodesFilterState } from '@kbn/alerting-v2-episodes-ui/queries/episodes_query';
import type { AlertEpisodesKibanaServices } from '../../../../episodes_kibana_services';
export interface EpisodesKpisProps {
    services: AlertEpisodesKibanaServices;
    filterState: EpisodesFilterState;
    timeRange: TimeRange;
}
export declare const EpisodesKpis: ({ services, filterState, timeRange }: EpisodesKpisProps) => React.JSX.Element;
