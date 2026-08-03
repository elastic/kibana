import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { CreateTagOptions, ITagsClient, Tag, TagAttributes } from '../../../common/types';
interface TagsClientOptions {
    client: SavedObjectsClientContract;
}
export declare class TagsClient implements ITagsClient {
    private readonly soClient;
    private readonly type;
    constructor({ client }: TagsClientOptions);
    create(attributes: TagAttributes, options?: CreateTagOptions): Promise<Tag>;
    update(id: string, attributes: TagAttributes): Promise<Tag>;
    get(id: string): Promise<Tag>;
    getAll(): Promise<Tag[]>;
    findByName(name: string, { exact }?: {
        exact?: boolean | undefined;
    }): Promise<Tag | null>;
    delete(id: string): Promise<void>;
}
export {};
