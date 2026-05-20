import type { HttpStart } from '@kbn/core-http-browser';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import type { EpisodeAction } from './types';
export interface UnackActionDeps {
    http: HttpStart;
    notifications: NotificationsStart;
}
export declare const createUnackAction: (deps: UnackActionDeps) => EpisodeAction;
