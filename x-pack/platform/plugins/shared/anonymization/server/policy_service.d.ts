import { type CoreStart } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { ProfilesRepository } from './repository';
import type { SaltService } from './salt';
import type { AnonymizationPolicyService, AnonymizationProfileInitializer } from './types';
interface CreateAnonymizationPolicyServiceParams {
    anonymizationEnabled: boolean;
    core: CoreStart;
    logger: Logger;
    ensureProfilesIndexReady: () => Promise<void>;
    profilesRepo: ProfilesRepository;
    saltService: SaltService;
    getProfileInitializers: () => AnonymizationProfileInitializer[];
}
export declare const createAnonymizationPolicyService: ({ anonymizationEnabled, core, logger, ensureProfilesIndexReady, profilesRepo, saltService, getProfileInitializers, }: CreateAnonymizationPolicyServiceParams) => AnonymizationPolicyService;
export {};
