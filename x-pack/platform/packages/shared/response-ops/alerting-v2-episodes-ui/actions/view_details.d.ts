import type { ApplicationStart } from '@kbn/core-application-browser';
import type { EpisodeAction } from './types';
export interface ViewDetailsActionDeps {
    application: ApplicationStart;
    /** Resolves the in-app path for an episode details page. Caller prepends basePath. */
    getEpisodeDetailsHref: (episodeId: string) => string;
}
export declare const createViewDetailsAction: (deps: ViewDetailsActionDeps) => EpisodeAction;
