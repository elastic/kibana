import type { ElasticsearchClient } from '@kbn/core/server';
import type { AnonymizationProfile, AnonymizationProfileRules, FindAnonymizationProfilesQuery } from '@kbn/anonymization-common';
type ProfileTargetType = AnonymizationProfile['targetType'];
interface CreateProfileParams {
    name: string;
    description?: string;
    targetType: ProfileTargetType;
    targetId: string;
    rules: AnonymizationProfileRules;
    namespace: string;
    createdBy: string;
}
interface UpdateProfileParams {
    name?: string;
    description?: string;
    rules?: {
        fieldRules: CreateProfileParams['rules']['fieldRules'];
        regexRules?: CreateProfileParams['rules']['regexRules'];
        nerRules?: CreateProfileParams['rules']['nerRules'];
    };
    updatedBy: string;
}
interface FindProfilesParams {
    namespace: string;
    filter?: FindAnonymizationProfilesQuery['filter'];
    targetType?: FindAnonymizationProfilesQuery['target_type'];
    targetId?: FindAnonymizationProfilesQuery['target_id'];
    sortField?: FindAnonymizationProfilesQuery['sort_field'];
    sortOrder?: FindAnonymizationProfilesQuery['sort_order'];
    page?: FindAnonymizationProfilesQuery['page'];
    perPage?: FindAnonymizationProfilesQuery['per_page'];
}
interface FindProfilesResult {
    page: number;
    perPage: number;
    total: number;
    data: AnonymizationProfile[];
}
/**
 * Repository for CRUD operations on Anonymization Profiles.
 * Operates directly against the `.anonymization-profiles` system index.
 */
export declare class ProfilesRepository {
    private readonly esClient;
    constructor(esClient: ElasticsearchClient);
    private getSaltId;
    private buildProfileId;
    private isConflictError;
    private rulesToEsDoc;
    /**
     * Creates a new profile. Enforces uniqueness per (namespace, target_type, target_id).
     * @throws ConflictError if a profile for the same target already exists in the space.
     */
    create(params: CreateProfileParams): Promise<AnonymizationProfile>;
    /**
     * Retrieves a profile by ID within a namespace.
     */
    get(namespace: string, profileId: string): Promise<AnonymizationProfile | null>;
    /**
     * Updates an existing profile. target_type and target_id are immutable.
     */
    update(namespace: string, profileId: string, params: UpdateProfileParams): Promise<AnonymizationProfile | null>;
    /**
     * Deletes a profile by ID within a namespace.
     */
    delete(namespace: string, profileId: string): Promise<boolean>;
    /**
     * Finds profiles within a namespace with optional filtering, sorting, and pagination.
     */
    find(params: FindProfilesParams): Promise<FindProfilesResult>;
    /**
     * Finds a profile by target within a namespace.
     */
    findByTarget(namespace: string, targetType: ProfileTargetType, targetId: string): Promise<AnonymizationProfile | null>;
    /**
     * Converts an ES document to the public AnonymizationProfile type.
     */
    private toProfile;
}
export {};
