import { FieldMetadata } from '../../../../common/fields_metadata/models/field_metadata';
import type { IntegrationFieldName } from '../../../../common';
import type { IntegrationFieldsExtractor, IntegrationFieldsSearchParams, IntegrationListExtractor } from './types';
interface IntegrationFieldsRepositoryDeps {
    integrationFieldsExtractor: IntegrationFieldsExtractor;
    integrationListExtractor: IntegrationListExtractor;
}
export declare class IntegrationFieldsRepository {
    private readonly integrationFieldsExtractor;
    private readonly integrationListExtractor;
    private cache;
    private integrationsMap;
    private constructor();
    getByName(fieldName: IntegrationFieldName, params: Partial<IntegrationFieldsSearchParams>): Promise<FieldMetadata | undefined>;
    static create({ integrationFieldsExtractor, integrationListExtractor, }: IntegrationFieldsRepositoryDeps): IntegrationFieldsRepository;
    private extractIntegrationFieldsSearchParams;
    private extractFields;
    private extractIntegrationList;
    private getCachedField;
    private storeFieldsInCache;
    private getCacheKey;
    private mapExtractedFieldsToFieldMetadataTree;
    private mapExtractedIntegrationListToMap;
}
export {};
