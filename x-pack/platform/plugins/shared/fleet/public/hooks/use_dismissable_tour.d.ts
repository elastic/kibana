import { type TourKey } from '../constants';
/**
 * Hook for managing dismissible tours in Fleet.
 * This uses the TourManager to ensure only one tour is displayed at a time.
 * @param tourKey - The key identifying the tour in storage
 * @param enabled - Additional condition that must be true for the tour to show
 */
export declare function useDismissableTour(tourKey: TourKey, enabled?: boolean): {
    isHidden: boolean;
    isOpen: boolean;
    dismiss: () => void;
};
