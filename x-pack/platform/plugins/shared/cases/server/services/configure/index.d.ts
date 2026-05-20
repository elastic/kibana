import type { Logger, SavedObjectsFindResponse, SavedObjectsUpdateResponse } from '@kbn/core/server';
import type { DeleteCaseConfigureArgs, FindCaseConfigureArgs, GetCaseConfigureArgs, PatchCaseConfigureArgs, PostCaseConfigureArgs } from './types';
import type { ConfigurationSavedObjectTransformed, ConfigurationTransformedAttributes } from '../../common/types/configure';
export declare class CaseConfigureService {
    private readonly log;
    constructor(log: Logger);
    delete({ unsecuredSavedObjectsClient, configurationId, refresh, }: DeleteCaseConfigureArgs): Promise<void>;
    get({ unsecuredSavedObjectsClient, configurationId, }: GetCaseConfigureArgs): Promise<ConfigurationSavedObjectTransformed>;
    find({ unsecuredSavedObjectsClient, options, }: FindCaseConfigureArgs): Promise<SavedObjectsFindResponse<ConfigurationTransformedAttributes>>;
    post({ unsecuredSavedObjectsClient, attributes, id, refresh, }: PostCaseConfigureArgs): Promise<ConfigurationSavedObjectTransformed>;
    patch({ unsecuredSavedObjectsClient, configurationId, updatedAttributes, originalConfiguration, refresh, }: PatchCaseConfigureArgs): Promise<SavedObjectsUpdateResponse<ConfigurationTransformedAttributes>>;
}
