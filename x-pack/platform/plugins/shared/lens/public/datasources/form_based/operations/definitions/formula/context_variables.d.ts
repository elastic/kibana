import type { IntervalIndexPatternColumn, NowIndexPatternColumn, TimeRangeIndexPatternColumn, FormBasedLayer, GenericIndexPatternColumn } from '@kbn/lens-common';
import type { OperationDefinition } from '..';
export declare function getColumnOrder(layer: FormBasedLayer): string[];
export declare function isColumnOfType<C extends GenericIndexPatternColumn>(type: C['operationType'], column: GenericIndexPatternColumn): column is C;
export declare const timeRangeOperation: OperationDefinition<TimeRangeIndexPatternColumn, "managedReference">;
export declare const nowOperation: OperationDefinition<NowIndexPatternColumn, "managedReference">;
export declare const intervalOperation: OperationDefinition<IntervalIndexPatternColumn, "managedReference">;
