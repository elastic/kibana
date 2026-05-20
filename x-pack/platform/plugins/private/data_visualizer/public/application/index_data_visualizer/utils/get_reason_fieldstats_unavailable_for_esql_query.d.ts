import type { AggregateQuery } from '@kbn/es-query';
import type { Query } from '@kbn/es-query';
export declare const getReasonIfFieldStatsUnavailableForQuery: (query?: AggregateQuery | Query | {
    [key: string]: any;
}) => string | undefined;
