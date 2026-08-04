import type { unitOfTime } from 'moment';
import type { MinimumTimeRangeOption } from '../../../../common/embeddables/pattern_analysis/types';
export declare const DEFAULT_MINIMUM_TIME_RANGE_OPTION: MinimumTimeRangeOption;
type MinimumTimeRange = Record<MinimumTimeRangeOption, {
    label: string;
    factor: number;
    unit: unitOfTime.Base;
}>;
export declare const MINIMUM_TIME_RANGE: MinimumTimeRange;
export {};
