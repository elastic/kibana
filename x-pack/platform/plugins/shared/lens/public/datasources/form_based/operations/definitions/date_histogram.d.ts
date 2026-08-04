import type { DateHistogramIndexPatternColumn } from '@kbn/lens-common';
import type { OperationDefinition } from '.';
export declare const dateHistogramOperation: OperationDefinition<DateHistogramIndexPatternColumn, 'field', {
    interval: string;
    dropPartials?: boolean;
    includeEmptyRows?: boolean;
}>;
