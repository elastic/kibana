/**
 * Using react-query queryClient to invalidate all the
 * case view page cache namespace.
 *
 * This effectively clears the cache for all the case view pages and
 * forces the page to fetch all the data again. Including
 * metrics, actions, comments, etc.
 */
export declare const useRefreshCaseViewPage: () => () => void;
