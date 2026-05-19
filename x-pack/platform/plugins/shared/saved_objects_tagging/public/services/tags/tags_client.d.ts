import type { HttpSetup, AnalyticsServiceStart } from '@kbn/core/public';
import type { ITagsCache } from '@kbn/saved-objects-tagging-oss-plugin/public';
import type { Tag, TagAttributes, GetAllTagsOptions, ITagsClient, TagWithRelations } from '../../../common/types';
import type { ITagsChangeListener } from './tags_cache';
export interface TagsClientOptions {
    analytics: AnalyticsServiceStart;
    http: HttpSetup;
    /** When set, read APIs consult this cache before calling the network. */
    cache?: ITagsCache & ITagsChangeListener;
}
export interface FindTagsOptions {
    page?: number;
    perPage?: number;
    search?: string;
}
export interface FindTagsResponse {
    tags: TagWithRelations[];
    total: number;
}
export interface ITagInternalClient extends ITagsClient {
    find(options: FindTagsOptions): Promise<FindTagsResponse>;
    bulkDelete(ids: string[]): Promise<void>;
}
export declare class TagsClient implements ITagInternalClient {
    private readonly analytics;
    private readonly http;
    private readonly cache?;
    constructor({ analytics, http, cache }: TagsClientOptions);
    create(attributes: TagAttributes): Promise<Tag>;
    update(id: string, attributes: TagAttributes): Promise<Tag>;
    get(id: string): Promise<Tag>;
    /**
     * Loads all tags from the server, updates the change listener / cache, and returns the list.
     * Used by {@link TagsCache} refresh so periodic reloads always hit the network.
     */
    fetchAllFromNetwork({ asSystemRequest }?: GetAllTagsOptions): Promise<Tag[]>;
    getAll(options?: GetAllTagsOptions): Promise<Tag[]>;
    delete(id: string): Promise<void>;
    find({ page, perPage, search }: FindTagsOptions): Promise<FindTagsResponse>;
    findByName(name: string, { exact }?: {
        exact?: boolean;
    }): Promise<Tag | null>;
    private mergeFindResultsIntoCache;
    bulkDelete(tagIds: string[]): Promise<void>;
}
