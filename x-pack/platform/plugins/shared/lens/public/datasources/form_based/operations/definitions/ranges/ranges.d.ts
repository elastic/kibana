import type { RangeIndexPatternColumn, RangeType, RangeTypeLens } from '@kbn/lens-common';
import type { OperationDefinition } from '..';
export type RangeColumnParams = RangeIndexPatternColumn['params'];
export type UpdateParamsFnType = <K extends keyof RangeColumnParams>(paramName: K, value: RangeColumnParams[K]) => void;
export declare const isRangeWithin: (range: RangeType) => boolean;
export declare const isValidRange: (range: RangeTypeLens) => boolean;
export declare const rangeOperation: OperationDefinition<RangeIndexPatternColumn, 'field', RangeColumnParams>;
