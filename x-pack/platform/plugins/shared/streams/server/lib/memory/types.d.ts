import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
/**
 * A memory page as stored in the main memory index.
 * Pages have stable UUIDs and mutable names. Organization
 * is via categories (Wikipedia-style, many-to-many) rather
 * than a fixed path hierarchy.
 */
export interface MemoryEntry {
    /** Stable UUID — never changes once created */
    id: string;
    /** Human-readable unique name (mutable). Used for display and lookup. */
    name: string;
    /** Human-readable title */
    title: string;
    /** Markdown content */
    content: string;
    /** Categories this page belongs to (e.g. ["services", "streams/logs-otel"]) */
    categories: string[];
    /** IDs of other pages referenced from this page's content */
    references: string[];
    /** Monotonically increasing version per entry */
    version: number;
    /** Tags for classification */
    tags: string[];
    created_at: string;
    updated_at: string;
    created_by: string;
    updated_by: string;
}
/**
 * A version history record for a memory entry.
 */
export interface MemoryVersionRecord {
    id: string;
    entry_id: string;
    version: number;
    name: string;
    title: string;
    content: string;
    change_type: MemoryChangeType;
    change_summary: string;
    created_at: string;
    created_by: string;
}
export type MemoryChangeType = 'create' | 'update' | 'delete' | 'rename';
/**
 * A node in the category tree hierarchy.
 */
export interface MemoryCategoryNode {
    /** Category name segment (e.g. "services" or "logs-otel") */
    name: string;
    /** Full category path (e.g. "streams/logs-otel") */
    category: string;
    /** Pages directly in this category */
    pages: Array<{
        id: string;
        name: string;
        title: string;
    }>;
    /** Sub-categories */
    children: MemoryCategoryNode[];
}
/**
 * A memory search result with relevance score.
 */
export interface MemorySearchResult {
    id: string;
    name: string;
    title: string;
    snippet: string;
    score: number;
    updated_at: string;
    updated_by: string;
    tags: string[];
    categories: string[];
}
/** Parameters for creating a memory entry */
export interface CreateMemoryParams {
    name: string;
    title: string;
    content: string;
    categories?: string[];
    references?: string[];
    tags?: string[];
    user: string;
}
/** Parameters for updating a memory entry */
export interface UpdateMemoryParams {
    id: string;
    content?: string;
    title?: string;
    name?: string;
    categories?: string[];
    references?: string[];
    tags?: string[];
    user: string;
    changeSummary?: string;
}
/** Parameters for searching memory */
export interface SearchMemoryParams {
    query: string;
    tags?: string[];
    categories?: string[];
    references?: string[];
    size?: number;
}
/** Dependencies for the memory service */
export interface MemoryServiceDeps {
    logger: Logger;
    esClient: ElasticsearchClient;
}
/**
 * Memory service interface — manages the persistent knowledge base.
 * Memory is global (space-agnostic). Pages are organized via categories
 * (Wikipedia-style) rather than a fixed path hierarchy.
 */
export interface MemoryService {
    create(params: CreateMemoryParams): Promise<MemoryEntry>;
    get(params: {
        id: string;
    }): Promise<MemoryEntry>;
    getByName(params: {
        name: string;
    }): Promise<MemoryEntry | undefined>;
    update(params: UpdateMemoryParams): Promise<MemoryEntry>;
    delete(params: {
        id: string;
        user: string;
    }): Promise<void>;
    rename(params: {
        id: string;
        newName: string;
        user: string;
    }): Promise<MemoryEntry>;
    addCategory(params: {
        id: string;
        category: string;
        user: string;
    }): Promise<MemoryEntry>;
    removeCategory(params: {
        id: string;
        category: string;
        user: string;
    }): Promise<MemoryEntry>;
    listCategories(): Promise<string[]>;
    getCategoryTree(): Promise<MemoryCategoryNode[]>;
    getBacklinks(params: {
        id: string;
    }): Promise<MemoryEntry[]>;
    search(params: SearchMemoryParams): Promise<MemorySearchResult[]>;
    listAll(): Promise<MemoryEntry[]>;
    listByCategory(params: {
        category: string;
    }): Promise<MemoryEntry[]>;
    getHistory(params: {
        entryId: string;
        size?: number;
    }): Promise<MemoryVersionRecord[]>;
    getVersion(params: {
        entryId: string;
        version: number;
    }): Promise<MemoryVersionRecord>;
    getRecentChanges(params: {
        size?: number;
    }): Promise<MemoryVersionRecord[]>;
}
