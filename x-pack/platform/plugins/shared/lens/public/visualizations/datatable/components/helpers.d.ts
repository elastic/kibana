import type { Datatable, DatatableColumnMeta } from '@kbn/expressions-plugin/common';
declare function buildColumnsMetaLookupInner(table: Datatable): Record<string, {
    name: string;
    index: number;
    meta?: DatatableColumnMeta;
    isComputedColumn?: boolean;
}>;
export declare const buildColumnsMetaLookup: import("memoize-one").MemoizedFn<typeof buildColumnsMetaLookupInner>;
export declare const isEsqlTableComputedColumn: (table: Datatable, columnId: string) => boolean;
export declare const getEsqlComputedColumnFilterDisabledMessage: string;
export declare const getGenericFilterDisabledMessage: string;
export {};
