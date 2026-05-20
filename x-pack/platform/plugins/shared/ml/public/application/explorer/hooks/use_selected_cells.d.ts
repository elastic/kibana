import type { AppStateSelectedCells } from '../explorer_utils';
export interface SelectionTimeRange {
    earliestMs: number;
    latestMs: number;
}
export declare function getTimeBoundsFromSelection(selectedCells: AppStateSelectedCells | undefined | null): SelectionTimeRange | undefined;
