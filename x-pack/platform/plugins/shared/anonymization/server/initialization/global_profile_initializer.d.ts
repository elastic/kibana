import type { Logger } from '@kbn/core/server';
import type { NerRule, RegexRule } from '@kbn/anonymization-common';
import { GLOBAL_ANONYMIZATION_PROFILE_TARGET_ID, GLOBAL_ANONYMIZATION_PROFILE_TARGET_TYPE } from '@kbn/anonymization-common';
import type { ProfilesRepository } from '../repository';
export { GLOBAL_ANONYMIZATION_PROFILE_TARGET_TYPE, GLOBAL_ANONYMIZATION_PROFILE_TARGET_ID };
export declare const GLOBAL_ANONYMIZATION_PROFILE_NAME = "Global Anonymization Profile";
export declare const isGlobalProfileTarget: (targetType: string, targetId: string) => boolean;
export declare const ensureGlobalAnonymizationProfile: ({ namespace, profilesRepo, logger, createdBy, regexRules, nerRules, }: {
    namespace: string;
    profilesRepo: ProfilesRepository;
    logger: Logger;
    createdBy?: string;
    regexRules?: RegexRule[];
    nerRules?: NerRule[];
}) => Promise<void>;
