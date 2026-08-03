/**
 * Normalizes the debounced raw query for SML search API and react-query keys.
 * Whitespace-only input becomes a wildcard so the menu can load default matches.
 * Length is capped to match the internal HTTP route.
 */
export declare const normalizeSmlSearchQuery: (debouncedQuery: string) => string;
