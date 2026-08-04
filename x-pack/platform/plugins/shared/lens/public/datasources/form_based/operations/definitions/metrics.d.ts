import type { AvgIndexPatternColumn, MaxIndexPatternColumn, MedianIndexPatternColumn, MinIndexPatternColumn, StandardDeviationIndexPatternColumn, SumIndexPatternColumn } from '@kbn/lens-common';
import type { OperationDefinition } from '.';
export declare const minOperation: OperationDefinition<MinIndexPatternColumn, "field", {}, true>;
export declare const maxOperation: OperationDefinition<MaxIndexPatternColumn, "field", {}, true>;
export declare const averageOperation: OperationDefinition<AvgIndexPatternColumn, "field", {}, true>;
export declare const standardDeviationOperation: OperationDefinition<StandardDeviationIndexPatternColumn, "field", {}, true>;
export declare const sumOperation: OperationDefinition<SumIndexPatternColumn, "field", {}, true>;
export declare const medianOperation: OperationDefinition<MedianIndexPatternColumn, "field", {}, true>;
