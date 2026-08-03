import type { OverallAverageIndexPatternColumn, OverallMaxIndexPatternColumn, OverallMinIndexPatternColumn, OverallSumIndexPatternColumn } from '@kbn/lens-common';
import type { OperationDefinition } from '..';
export declare const overallSumOperation: OperationDefinition<OverallSumIndexPatternColumn, "fullReference">;
export declare const overallMinOperation: OperationDefinition<OverallMinIndexPatternColumn, "fullReference">;
export declare const overallMaxOperation: OperationDefinition<OverallMaxIndexPatternColumn, "fullReference">;
export declare const overallAverageOperation: OperationDefinition<OverallAverageIndexPatternColumn, "fullReference">;
