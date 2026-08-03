import type { HttpStart } from '@kbn/core-http-browser';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import type { EpisodeAction } from './types';
export interface AckActionDeps {
    http: HttpStart;
    notifications: NotificationsStart;
}
export declare const createAckAction: (deps: AckActionDeps) => EpisodeAction;
