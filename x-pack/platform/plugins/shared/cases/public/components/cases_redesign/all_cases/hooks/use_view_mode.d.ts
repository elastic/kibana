import type { ViewToggleId } from '../constants';
export declare function useViewMode(): {
    viewMode: ViewToggleId;
    setViewMode: (newItem: ViewToggleId | ((prev: ViewToggleId) => ViewToggleId)) => void;
};
