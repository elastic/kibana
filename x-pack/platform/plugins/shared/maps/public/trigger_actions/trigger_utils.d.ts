import type { Action } from '@kbn/ui-actions-plugin/public';
import type { DatatableColumnType } from '@kbn/expressions-plugin/common';
import type { RawValue } from '../../common/constants';
export declare function isUrlDrilldown(action: Action): boolean;
export declare function toValueClickDataFormat(key: string, value: RawValue): {
    table: {
        columns: {
            id: string;
            meta: {
                type: DatatableColumnType;
                field: string;
            };
            name: string;
        }[];
        rows: {
            [key]: RawValue;
        }[];
    };
    column: number;
    row: number;
    value: RawValue;
}[];
