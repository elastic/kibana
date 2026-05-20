import React, { type ReactNode } from 'react';
interface TourManagerContextType {
    activeTour: string | null;
    setActiveTour: (tourId: string | null) => void;
}
export declare const TourManagerProvider: React.FC<{
    children: ReactNode;
}>;
/**
 * Hook to manage tour coordination across Fleet components.
 * Ensures only one tour is displayed at a time to prevent overlap.
 */
export declare const useTourManager: () => TourManagerContextType;
export {};
