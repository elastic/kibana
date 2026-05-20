import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { MemoryEntry, MemoryVersionRecord, MemoryCategoryNode, MemorySearchResult, CreateMemoryParams, UpdateMemoryParams, SearchMemoryParams, MemoryService } from './types';
export declare class MemoryServiceImpl implements MemoryService {
    private readonly storage;
    private readonly historyStorage;
    private readonly logger;
    constructor({ logger, esClient }: {
        logger: Logger;
        esClient: ElasticsearchClient;
    });
    create(params: CreateMemoryParams): Promise<MemoryEntry>;
    get({ id }: {
        id: string;
    }): Promise<MemoryEntry>;
    getByName({ name }: {
        name: string;
    }): Promise<MemoryEntry | undefined>;
    update(params: UpdateMemoryParams): Promise<MemoryEntry>;
    delete({ id, user }: {
        id: string;
        user: string;
    }): Promise<void>;
    rename({ id, newName, user, }: {
        id: string;
        newName: string;
        user: string;
    }): Promise<MemoryEntry>;
    addCategory({ id, category, user, }: {
        id: string;
        category: string;
        user: string;
    }): Promise<MemoryEntry>;
    removeCategory({ id, category, user, }: {
        id: string;
        category: string;
        user: string;
    }): Promise<MemoryEntry>;
    private _updateCategories;
    listCategories(): Promise<string[]>;
    getCategoryTree(): Promise<MemoryCategoryNode[]>;
    getBacklinks({ id }: {
        id: string;
    }): Promise<MemoryEntry[]>;
    search(params: SearchMemoryParams): Promise<MemorySearchResult[]>;
    listAll(): Promise<MemoryEntry[]>;
    listByCategory({ category }: {
        category: string;
    }): Promise<MemoryEntry[]>;
    getHistory({ entryId, size, }: {
        entryId: string;
        size?: number;
    }): Promise<MemoryVersionRecord[]>;
    getVersion({ entryId, version, }: {
        entryId: string;
        version: number;
    }): Promise<MemoryVersionRecord>;
    getRecentChanges({ size }: {
        size?: number;
    }): Promise<MemoryVersionRecord[]>;
    private _getById;
    private _getByName;
    private _writeHistory;
}
