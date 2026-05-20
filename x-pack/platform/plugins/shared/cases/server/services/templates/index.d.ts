import type { ElasticsearchClient, ISavedObjectsSerializer, SavedObject, SavedObjectsClientContract } from '@kbn/core/server';
import type { CreateTemplateInput, Template, UpdateTemplateInput } from '../../../common/types/domain/template/v1';
import type { TemplatesFindRequest, TemplatesFindResponse } from '../../../common/types/api/template/v1';
export declare class TemplatesService {
    private readonly dependencies;
    constructor(dependencies: {
        unsecuredSavedObjectsClient: SavedObjectsClientContract;
        savedObjectsSerializer: ISavedObjectsSerializer;
        esClient: ElasticsearchClient;
        namespace: string;
    });
    getAllTemplates(params: TemplatesFindRequest): Promise<TemplatesFindResponse>;
    getTemplate(templateId: string, version?: string, { includeDeleted }?: {
        includeDeleted?: boolean;
    }): Promise<SavedObject<Template> | undefined>;
    /**
     * Fetches ALL template versions (not just isLatest) for extended field filtering in case search.
     *
     * This is critical for extended field filtering because cases may reference
     * older template versions where field definitions have changed. We need to
     * resolve filters against ALL versions to correctly match cases created with
     * historical template versions.
     *
     * Example: If template v1 has "effort estimate" field and v2 renames it to
     * "some estimate", searching for "effort estimate" should only match cases
     * created with v1, not v2. By fetching ALL versions, the filter resolution
     * correctly identifies which template versions have which fields.
     *
     * @param params - Find parameters (owner, isDeleted)
     * @returns Promise resolving to array of all template versions matching the criteria
     *
     * @example
     * // Get all versions of Security Solution templates for extended field search
     * const allVersions = await service.getTemplateVersionsForExtendedFieldSearch({
     *   owner: ['securitySolution'],
     * });
     */
    getTemplateVersionsForExtendedFieldSearch(params: {
        owner?: string[];
    }): Promise<Array<SavedObject<Template>>>;
    private _getTemplate;
    /**
     * Fetches templates from ES using regular search.
     */
    private searchTemplates;
    createTemplate(input: CreateTemplateInput, author: string, id?: string): Promise<SavedObject<Template>>;
    updateTemplate(templateId: string, input: UpdateTemplateInput): Promise<SavedObject<Template>>;
    /**
     * Returns all unique tags from the latest version of each non-deleted template.
     */
    getTags(): Promise<string[]>;
    /**
     * Returns all unique authors from the latest version of each non-deleted template.
     */
    getAuthors(): Promise<string[]>;
    incrementUsageStats(templateId: string): Promise<void>;
    deleteTemplate(templateId: string): Promise<void>;
}
