import type { TimeScaleUnit } from '@kbn/lens-common';
export declare const DEFAULT_TIME_SCALE: TimeScaleUnit;
export declare function adjustTimeScaleLabelSuffix(oldLabel: string, previousTimeScale: TimeScaleUnit | undefined, newTimeScale: TimeScaleUnit | undefined, previousShift: string | undefined, newShift: string | undefined, previousReducedTimeRange: string | undefined, newReducedTimeRange: string | undefined): string;
