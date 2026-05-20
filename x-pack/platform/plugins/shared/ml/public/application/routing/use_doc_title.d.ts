import type { MlRoute } from './router';
/**
 * Handles document title automatically based on the active route.
 * Returns a callback for manual title updates.
 */
export declare const useDocTitle: (activeRoute: MlRoute | undefined) => (title: string) => void;
