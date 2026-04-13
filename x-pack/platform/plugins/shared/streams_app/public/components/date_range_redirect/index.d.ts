import React from 'react';
/**
 * Component that ensures time range params (rangeFrom/rangeTo) are present in the URL.
 * If they are missing, it blocks rendering and redirects to add default values.
 *
 * When adding defaults, it reads from the global timefilter first (which retains the
 * last known time within the session), falling back to Kibana's default time settings.
 * This allows navigation links that don't explicitly pass rangeFrom/rangeTo to still
 * preserve the time range within a session.
 *
 * Also syncs URL time params to the global timefilter on mount and URL changes.
 * This ensures components using useTimefilter() get the correct time from URL.
 *
 * TODO: Ideally all router.link/push calls should pass time params explicitly.
 * See the route definitions in routes/config.tsx for the expected query params.
 */
export declare function DateRangeRedirect({ children }: {
    children: React.ReactNode;
}): React.JSX.Element | null;
