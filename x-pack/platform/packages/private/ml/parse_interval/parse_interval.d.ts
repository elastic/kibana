import type { Duration } from 'moment';
/**
 * Parses an interval string, such as 7d, 1h, or 30m to a moment duration.
 * Optionally carries out an additional check that the interval is supported as a
 * time unit by Elasticsearch, as units greater than 'd' for example cannot be used
 * for anomaly detection job bucket spans.
 *
 * Differs from the Kibana ui/utils/parse_interval in the following ways:
 * 1. A value-less interval such as 'm' is not allowed - in line with the ML back-end
 *    not accepting such interval strings for the bucket span of a job.
 * 2. Zero length durations 0ms, 0s, 0m, and 0h are accepted as-is.
 *    Note that when adding or subtracting fractional durations, moment is only designed
 *    to work with units less than 'day'.
 * 3. Fractional intervals e.g. 1.5h or 4.5d are not allowed, in line with the behaviour
 *    of the Elasticsearch date histogram aggregation.
 *
 * @param interval - The interval to parse.
 * @param checkValidEsUnit - Optional. Specifies whether to check if the unit is a valid Elasticsearch duration unit. Default is false.
 * @returns The parsed Duration object, or null if the interval is invalid.
 */
export declare function parseInterval(interval: string | number, checkValidEsUnit?: boolean): Duration | null;
