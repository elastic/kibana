import type { Logger } from '@kbn/core/server';
import { type NerRule, type RegexRule } from '@kbn/anonymization-common';
import type { ProfilesRepository } from '../repository';
export declare const LEGACY_ANONYMIZATION_UI_SETTING_KEY = "ai:anonymizationSettings";
export declare const extractEnabledLegacyRules: (settingsString: string) => {
    regexRules: RegexRule[];
    nerRules: NerRule[];
};
export declare const migrateLegacyUiSettingsIntoGlobalProfile: ({ namespace, settingsString, profilesRepo, logger, }: {
    namespace: string;
    settingsString?: string;
    profilesRepo: ProfilesRepository;
    logger: Logger;
}) => Promise<boolean>;
