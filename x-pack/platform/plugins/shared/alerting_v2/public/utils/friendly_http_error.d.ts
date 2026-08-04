/**
 * Map an HTTP error to a short, user-facing sentence suitable for a toast.
 *
 * The toast is the brief surface — the long server message (body.message)
 * still lives behind "See the full error". This helper returns translated
 * copy for common statuses and falls back to the raw HTTP status text for
 * the rest.
 */
export declare const getFriendlyRuleHttpErrorToastMessage: (error: Error) => string;
