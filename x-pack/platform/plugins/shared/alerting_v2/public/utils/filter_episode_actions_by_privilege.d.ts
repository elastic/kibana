import { type EpisodeAction } from '@kbn/alerting-v2-episodes-ui/actions';
/**
 * Privilege level applied when filtering episode actions: `all` keeps every
 * action, `read` keeps only the read-safe allowlist.
 */
export declare const EPISODE_ACTIONS_PRIVILEGE: {
    readonly all: "all";
    readonly read: "read";
};
export type EpisodeActionsPrivilege = (typeof EPISODE_ACTIONS_PRIVILEGE)[keyof typeof EPISODE_ACTIONS_PRIVILEGE];
/**
 * Removes mutating (write) episode actions when the user only has read
 * privilege. With `all` every action is kept; with `read` only actions in the
 * read-safe allowlist survive, so any action that is not explicitly read-safe
 * stays hidden by default.
 */
export declare const filterEpisodeActionsByPrivilege: (actions: EpisodeAction[], capability: EpisodeActionsPrivilege) => EpisodeAction[];
