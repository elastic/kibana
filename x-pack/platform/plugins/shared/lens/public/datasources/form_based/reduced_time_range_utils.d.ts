import type { FormBasedLayer, IndexPattern } from '@kbn/lens-common';
import type { FieldBasedOperationErrorMessage } from './operations/definitions';
export declare const reducedTimeRangeOptions: {
    label: string;
    value: string;
}[];
export declare const reducedTimeRangeOptionOrder: {
    [key: string]: number;
};
export declare function getColumnReducedTimeRangeError(layer: FormBasedLayer, columnId: string, indexPattern: IndexPattern): FieldBasedOperationErrorMessage[];
