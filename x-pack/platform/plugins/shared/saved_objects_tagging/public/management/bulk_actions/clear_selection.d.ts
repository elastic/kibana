import type { TagBulkAction } from '../types';
interface GetClearSelectionActionOptions {
    clearSelection: () => void;
}
export declare const getClearSelectionAction: ({ clearSelection, }: GetClearSelectionActionOptions) => TagBulkAction;
export {};
