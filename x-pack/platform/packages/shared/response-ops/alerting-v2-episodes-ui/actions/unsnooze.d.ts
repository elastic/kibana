import type { HttpStart } from '@kbn/core-http-browser';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import type { EpisodeAction } from './types';
export interface UnsnoozeActionDeps {
    http: HttpStart;
    notifications: NotificationsStart;
}
export declare const createUnsnoozeAction: (deps: UnsnoozeActionDeps) => EpisodeAction;
