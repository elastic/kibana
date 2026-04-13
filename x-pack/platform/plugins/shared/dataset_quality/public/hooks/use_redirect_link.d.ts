import type { AggregateQuery, Query } from '@kbn/es-query';
import type { RouterLinkProps } from '@kbn/router-utils/src/get_router_link_props';
import type { BasicDataStream, DataStreamSelector, TimeRangeConfig } from '../../common/types';
import type { SendTelemetryFn } from './use_redirect_link_telemetry';
export declare const useRedirectLink: <T extends BasicDataStream | string>({ dataStreamStat, query, timeRangeConfig, breakdownField, sendTelemetry, selector, external, }: {
    dataStreamStat: T;
    query?: Query | AggregateQuery;
    timeRangeConfig: TimeRangeConfig;
    breakdownField?: string;
    sendTelemetry: SendTelemetryFn;
    selector?: DataStreamSelector;
    external?: boolean;
}) => {
    linkProps: RouterLinkProps;
    navigate: () => void;
    isLogsExplorerAvailable: boolean;
};
