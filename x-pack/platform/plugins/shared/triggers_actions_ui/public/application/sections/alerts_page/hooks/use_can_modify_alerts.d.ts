/**
 * Returns whether the current user can modify Stack alerts (acknowledge, mark as
 * untracked, mute/unmute, edit tags).
 *
 * This reflects the `write` UI capability granted by the `stackAlertsOnly: all`
 * privilege. The underlying RAC `alert:all` / `rule:mute_alerts` privileges are not
 * exposed as browser capabilities, so the feature declares an explicit `write` UI
 * capability that we read here.
 */
export declare const useCanModifyAlerts: () => boolean;
