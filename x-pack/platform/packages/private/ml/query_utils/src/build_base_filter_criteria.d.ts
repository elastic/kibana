import type { estypes } from '@elastic/elasticsearch';
import type { Query } from '@kbn/es-query';
/**
 * Builds the base filter criteria used in queries,
 * adding criteria for the time range and an optional query.
 *
 * @param timeFieldName - optional time field name of the data view
 * @param earliestMs - optional earliest timestamp of the selected time range
 * @param latestMs - optional latest timestamp of the selected time range
 * @param query - optional query
 * @returns filter criteria
 */
export declare function buildBaseFilterCriteria(timeFieldName?: string, earliestMs?: number | string, latestMs?: number | string, query?: Query['query'], timeFormat?: string): NonNullable<estypes.QueryDslQueryContainer>[];
