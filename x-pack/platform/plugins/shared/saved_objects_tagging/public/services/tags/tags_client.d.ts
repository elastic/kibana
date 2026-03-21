import type { HttpSetup, AnalyticsServiceStart } from '@kbn/core/public';
import type { Tag, TagAttributes, GetAllTagsOptions, ITagsClient, TagWithRelations } from '../../../common/types';
import type { ITagsChangeListener } from './tags_cache';
export interface TagsClientOptions {
    analytics: AnalyticsServiceStart;
    http: HttpSetup;
    changeListener?: ITagsChangeListener;
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
    private readonly changeListener?;
    constructor({ analytics, http, changeListener }: TagsClientOptions);
    create(attributes: TagAttributes): Promise<Tag>;
    update(id: string, attributes: TagAttributes): Promise<Tag>;
    get(id: string): Promise<Tag>;
    getAll({ asSystemRequest }?: GetAllTagsOptions): Promise<Tag[]>;
    delete(id: string): Promise<void>;
    find({ page, perPage, search }: FindTagsOptions): Promise<FindTagsResponse>;
    findByName(name: string, { exact }?: {
        exact?: boolean;
    }): Promise<TagWithRelations | null>;
    bulkDelete(tagIds: string[]): Promise<void>;
}
