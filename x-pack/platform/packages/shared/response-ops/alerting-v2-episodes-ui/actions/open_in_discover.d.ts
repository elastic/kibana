import type { ApplicationStart } from '@kbn/core-application-browser';
import type { EpisodeAction } from './types';
export interface OpenInDiscoverActionDeps {
    application: ApplicationStart;
    /**
     * Resolves the Discover URL for an episode. May be async (e.g. if rule ES|QL is fetched on demand).
     * Caller returns undefined when no valid URL can be produced (rule without ES|QL, user lacks Discover access, etc.).
     */
    getDiscoverHref: (args: {
        episodeIsoTimestamp: string;
        ruleId: string;
    }) => string | undefined | Promise<string | undefined>;
}
export declare const createOpenInDiscoverAction: (deps: OpenInDiscoverActionDeps) => EpisodeAction;
