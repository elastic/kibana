import type { ExecutionContext } from '@kbn/expressions-plugin/common';
import type { DatatableUtilitiesService, TimeRangeBounds, TimeRange } from '@kbn/data-plugin/common';
import type { TimeScaleExpressionFunction } from '../../defs/time_scale/types';
/**
 * This function can be called both from server side and from the client side. Each of them could have
 * a different configured timezone. To be sure the time bounds are computed relative to the same passed timezone,
 * temporarily switch the default moment timezone to the one passed, and switch it back after the calculation is done.
 */
export declare function getTimeBounds(timeRange: TimeRange, timeZone?: string, getForceNow?: () => Date): TimeRangeBounds;
export declare const timeScaleFn: (getDatatableUtilities: (context: ExecutionContext) => DatatableUtilitiesService | Promise<DatatableUtilitiesService>, getTimezone: (context: ExecutionContext) => string | Promise<string>, getForceNow?: () => Date) => TimeScaleExpressionFunction["fn"];
