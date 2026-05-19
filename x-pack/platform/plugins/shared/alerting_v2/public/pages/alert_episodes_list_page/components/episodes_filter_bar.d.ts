import React, { type SetStateAction } from 'react';
import type { EpisodesFilterState } from '@kbn/alerting-v2-episodes-ui/queries/episodes_query';
import type { TimeRange } from '@kbn/es-query';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { HttpStart } from '@kbn/core-http-browser';
export interface EpisodesFilterBarProps {
    filterState: EpisodesFilterState;
    onFilterChange: (update: SetStateAction<EpisodesFilterState>) => void;
    timeRange: TimeRange;
    onTimeChange: (range: TimeRange) => void;
    ruleOptions: Array<{
        label: string;
        value: string;
    }>;
    assigneeUids: string[];
    onRefresh?: () => void;
    isLoading?: boolean;
    services: {
        http: HttpStart;
        expressions: ExpressionsStart;
    };
}
export declare const EpisodesFilterBar: ({ filterState, onFilterChange, timeRange, onTimeChange, ruleOptions, assigneeUids, onRefresh, isLoading, services, }: EpisodesFilterBarProps) => React.JSX.Element;
