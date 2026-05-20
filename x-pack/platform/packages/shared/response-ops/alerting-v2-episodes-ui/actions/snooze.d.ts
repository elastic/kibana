import type { HttpStart } from '@kbn/core-http-browser';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import type { OverlayStart } from '@kbn/core-overlays-browser';
import type { EpisodeAction } from './types';
export interface SnoozeActionDeps {
    http: HttpStart;
    overlays: OverlayStart;
    notifications: NotificationsStart;
    rendering: CoreStart['rendering'];
}
export declare const createSnoozeAction: (deps: SnoozeActionDeps) => EpisodeAction;
