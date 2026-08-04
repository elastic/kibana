/**
 * Whether notifications are currently snoozed for an episode/group.
 *
 * True when the latest snooze/unsnooze action is `snooze` and either there is
 * no expiry (indefinite) or the expiry is still in the future. Mirrors the KPI
 * ES|QL rule (`snooze_expiry IS NULL OR TO_DATETIME(snooze_expiry) > NOW()`).
 */
export declare const isEpisodeSnoozed: (lastSnoozeAction: string | null | undefined, snoozeExpiry: string | null | undefined) => boolean;
