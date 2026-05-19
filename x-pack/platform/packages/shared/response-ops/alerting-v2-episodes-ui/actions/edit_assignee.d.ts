import type { HttpStart } from '@kbn/core-http-browser';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import type { OverlayStart } from '@kbn/core-overlays-browser';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import type { QueryClient } from '@kbn/react-query';
import type { EpisodeAction } from './types';
export interface EditAssigneeActionDeps {
    http: HttpStart;
    overlays: OverlayStart;
    notifications: NotificationsStart;
    rendering: CoreStart['rendering'];
    userProfile: UserProfileService;
    docLinks: DocLinksStart;
    queryClient: QueryClient;
}
export declare const createEditAssigneeAction: (deps: EditAssigneeActionDeps) => EpisodeAction;
