import type { Datatable, DatatableColumnMeta } from '@kbn/expressions-plugin/common';
declare function buildColumnsMetaLookupInner(table: Datatable): Record<string, {
    name: string;
    index: number;
    meta?: DatatableColumnMeta;
}>;
export declare const buildColumnsMetaLookup: import("memoize-one").MemoizedFn<typeof buildColumnsMetaLookupInner>;
export {};
