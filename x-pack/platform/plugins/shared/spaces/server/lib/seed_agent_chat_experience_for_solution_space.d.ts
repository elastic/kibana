import type { CoreStart, Logger } from '@kbn/core/server';
export interface SeedAgentChatExperienceForSolutionSpaceParams {
    coreStart: CoreStart;
    log: Logger;
    spaceId: string;
    /** Space solution view (Classic, Observability, etc.); logged for diagnostics only. */
    solution: string | undefined;
    packageInfo: {
        version: string;
        buildNum: number;
    };
}
/**
 * Persists Agent as the preferred chat experience for new Classic, Security, or Observability spaces.
 *
 * Only seeds for `classic`, `security`, and `oblt` solution views — ES spaces and spaces with no
 * solution retain the schema default. Uses the internal repository and merges into the versioned
 * `config` document. If another writer (e.g. UI settings bootstrap) creates that document first,
 * a create can return 409; we then `update` so Agent still wins.
 */
export declare function seedAgentChatExperienceForSolutionSpace(params: SeedAgentChatExperienceForSolutionSpaceParams): Promise<void>;
