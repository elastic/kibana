/**
 * Silently writes the server-configured locale (from `kibana.yml`'s `i18n.locale`) to
 * the user's profile when they have no saved locale preference. This "primes" the
 * profile so the User Profile form has a concrete pre-selection that matches what
 * the user is actually seeing — avoiding a misleading empty/indeterminate state.
 *
 * When the user has no profile override, the client's `i18n.getLocale()` equals the
 * server-configured locale (the server embedded it in the translations URL). So we
 * can read it directly on the client and save it back.
 *
 * The save is one-shot per component mount and suppresses the success notification
 * so the user is unaware it happened.
 */
export declare const usePrimeUserLocale: () => void;
