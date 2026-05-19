import type { PercentileIndexPatternColumn } from '@kbn/lens-common';
import type { OperationDefinition } from '.';
export declare const percentileOperation: OperationDefinition<PercentileIndexPatternColumn, 'field', {
    percentile: number;
}, true>;
