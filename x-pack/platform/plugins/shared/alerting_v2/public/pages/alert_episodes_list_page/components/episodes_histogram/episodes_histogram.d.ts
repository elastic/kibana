import React from 'react';
import type { TimeRange } from '@kbn/es-query';
import { type DataView } from '@kbn/data-views-plugin/common';
import { type EpisodesFilterState } from '@kbn/alerting-v2-episodes-ui/queries/episodes_query';
import type { AlertEpisodesKibanaServices } from '../../../../episodes_kibana_services';
export interface EpisodesHistogramProps {
    services: AlertEpisodesKibanaServices;
    dataView: DataView | undefined;
    filterState: EpisodesFilterState;
    timeRange: TimeRange;
    onTimeRangeChange: (timeRange: TimeRange) => void;
    breakdownField?: string;
    onBreakdownFieldChange: (field: string | undefined) => void;
}
export declare const EpisodesHistogram: ({ services, dataView, filterState, timeRange, onTimeRangeChange, breakdownField, onBreakdownFieldChange, }: EpisodesHistogramProps) => React.JSX.Element;
