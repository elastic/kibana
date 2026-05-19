import type { FieldValue } from '@elastic/elasticsearch/lib/api/types';
import type { TimeRange } from '@kbn/es-query';
/**
 * Builds ES|QL named parameter entries for `_tstart` and `_tend`
 * from a time range, resolving any datemath expressions to absolute ISO timestamps.
 *
 * Returns `undefined` if no time range is provided.
 */
export declare function buildTimeRangeParams(timeRange: TimeRange | undefined): Array<Record<string, FieldValue>> | undefined;
