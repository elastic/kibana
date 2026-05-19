import type { ApplicationStart } from '@kbn/core-application-browser';
import type { HttpStart } from '@kbn/core-http-browser';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import type { OverlayStart } from '@kbn/core-overlays-browser';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { QueryClient } from '@kbn/react-query';
import type { EpisodeAction } from './types';
export interface EpisodeActionsDeps {
    http: HttpStart;
    overlays: OverlayStart;
    notifications: NotificationsStart;
    rendering: CoreStart['rendering'];
    application: ApplicationStart;
    userProfile: UserProfileService;
    docLinks: DocLinksStart;
    expressions: ExpressionsStart;
    queryClient: QueryClient;
    /** Resolver for single-episode-page URL (caller prepends basePath). */
    getEpisodeDetailsHref: (episodeId: string) => string;
    /** Resolver for "Open in Discover" URL; may be sync or async. Return undefined when not applicable. */
    getDiscoverHref: (args: {
        episodeIsoTimestamp: string;
        ruleId: string;
    }) => string | undefined | Promise<string | undefined>;
}
export declare const createEpisodeActions: (deps: EpisodeActionsDeps) => EpisodeAction[];
