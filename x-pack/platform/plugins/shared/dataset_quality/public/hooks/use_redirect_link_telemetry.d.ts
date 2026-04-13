import type { AggregateQuery, Query } from '@kbn/es-query';
import type { NavigationSource } from '../services/telemetry';
export type SendTelemetryFn = ReturnType<typeof useDatasetRedirectLinkTelemetry>['sendTelemetry'] | ReturnType<typeof useDatasetDetailsRedirectLinkTelemetry>['sendTelemetry'];
export declare const useDatasetRedirectLinkTelemetry: ({ rawName, query, }: {
    rawName: string;
    query?: Query | AggregateQuery;
}) => {
    sendTelemetry: () => void;
};
export declare const useDatasetDetailsRedirectLinkTelemetry: ({ query, navigationSource, }: {
    navigationSource: NavigationSource;
    query?: Query | AggregateQuery;
}) => {
    sendTelemetry: () => void;
};
