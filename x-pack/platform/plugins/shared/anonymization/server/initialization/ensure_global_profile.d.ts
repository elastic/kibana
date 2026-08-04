import type { Logger } from '@kbn/core/server';
import type { ProfilesRepository } from '../repository';
export declare const ensureGlobalProfileForNamespace: ({ namespace, profilesRepo, logger, getLegacySettingsString, forceEnsure, }: {
    namespace: string;
    profilesRepo: ProfilesRepository;
    logger: Logger;
    getLegacySettingsString?: () => Promise<string | undefined>;
    forceEnsure?: boolean;
}) => Promise<void>;
