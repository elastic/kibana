import type { History } from 'history';
/**
 * This hook allow to redirect to the provided path or using redirect_path if it's provided in the query params.
 */
export declare function useRedirectPath(history: History): (path: string) => void;
