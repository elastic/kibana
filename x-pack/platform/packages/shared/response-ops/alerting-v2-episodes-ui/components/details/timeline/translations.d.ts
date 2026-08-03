/** --- Timeline section (empty / error states) --- */
export declare const EMPTY_TITLE: string;
export declare const EMPTY_BODY: string;
export declare const BULK_GET_PROFILES_ERROR: string;
export declare const LOAD_MORE: string;
/** --- Timeline (shared labels) --- */
export declare const SYSTEM_LABEL: string;
/** --- Timeline (state-change sentences) --- */
export declare const STARTED_EPISODE_AS: string;
export declare const CHANGED_STATUS_TO: string;
export declare const SET_SEVERITY_TO: string;
export declare const CHANGED_SEVERITY_TO: string;
export declare const getAfterNEventsLabel: (count: number, prevStatus: string) => string;
/** --- Timeline (action sentences) --- */
export declare const ACTION_LABELS: Record<string, string>;
export declare const ASSIGNED_TO: string;
export declare const REMOVED_ASSIGNEE: string;
export declare const STATUS_LABELS: Record<string, string>;
/** --- Timeline (action event details) --- */
export declare const SNOOZED_INDEFINITELY: string;
export declare const getSnoozedUntilLabel: (date: string) => string;
export declare const formatSnoozeDuration: (startIso: string, endIso: string) => string | null;
