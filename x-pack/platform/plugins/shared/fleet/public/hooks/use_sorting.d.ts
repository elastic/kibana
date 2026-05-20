import type { CriteriaWithPagination } from '@elastic/eui/src/components/basic_table/basic_table';
export declare function useSorting<T>(defaultSorting: CriteriaWithPagination<T>['sort']): {
    sorting: {
        field: keyof T;
        direction: "asc" | "desc";
    } | undefined;
    setSorting: import("react").Dispatch<import("react").SetStateAction<{
        field: keyof T;
        direction: "asc" | "desc";
    } | undefined>>;
};
