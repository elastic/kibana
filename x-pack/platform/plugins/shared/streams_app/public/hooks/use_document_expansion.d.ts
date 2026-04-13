import type { DataTableRecordWithIndex } from '../components/data_management/shared';
export declare const useDocumentExpansion: (hits: DataTableRecordWithIndex[]) => {
    currentDoc: DataTableRecordWithIndex | undefined;
    selectedRowIndex: number;
    onRowSelected: (rowIndex: number) => void;
    setExpandedDoc: import("react").Dispatch<import("react").SetStateAction<DataTableRecordWithIndex | undefined>>;
};
