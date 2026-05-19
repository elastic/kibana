import type { HttpStart } from '@kbn/core-http-browser';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import type { OverlayStart } from '@kbn/core-overlays-browser';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { QueryClient } from '@kbn/react-query';
import type { EpisodeAction } from './types';
export interface EditTagsActionDeps {
    http: HttpStart;
    overlays: OverlayStart;
    notifications: NotificationsStart;
    rendering: CoreStart['rendering'];
    expressions: ExpressionsStart;
    queryClient: QueryClient;
}
export declare const createEditTagsAction: (deps: EditTagsActionDeps) => EpisodeAction;
