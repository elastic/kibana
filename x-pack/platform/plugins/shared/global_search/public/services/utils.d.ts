/**
 * Returns the default {@link GlobalSearchFindOptions.preference | preference} value.
 *
 * The implementation is based on the sessionStorage, which ensure the default value for a session/tab will remain the same.
 */
export declare const getDefaultPreference: (storage?: Storage) => string;
