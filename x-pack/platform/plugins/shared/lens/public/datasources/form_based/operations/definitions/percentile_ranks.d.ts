import type { PercentileRanksIndexPatternColumn } from '@kbn/lens-common';
import type { OperationDefinition } from '.';
export declare const percentileRanksOperation: OperationDefinition<PercentileRanksIndexPatternColumn, 'field', {
    value: number;
}, true>;
