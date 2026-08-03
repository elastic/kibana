import type { Duration } from 'moment';
import { type Observable } from 'rxjs';
import type { ITagsCache } from '@kbn/saved-objects-tagging-oss-plugin/public';
import type { Tag, TagAttributes } from '../../../common/types';
export type { ITagsCache };
export interface ITagsChangeListener {
    onDidDelete: (id: string) => void;
    onDidCreate: (tag: Tag) => void;
    onDidUpdate: (id: string, attributes: TagAttributes) => void;
    onDidGetAll: (tags: Tag[]) => void;
}
export type CacheRefreshHandler = () => Tag[] | Promise<Tag[]>;
interface TagsCacheOptions {
    refreshHandler: CacheRefreshHandler;
    refreshInterval?: Duration;
}
/**
 * Reactive client-side cache of the existing tags, connected to the TagsClient.
 *
 * Used (mostly) by the UI components to avoid performing http calls every time a component
 * needs to retrieve the list of all the existing tags or the tags associated with an object.
 */
export declare class TagsCache implements ITagsCache, ITagsChangeListener {
    private readonly refreshInterval?;
    private readonly refreshHandler;
    private intervalId?;
    private readonly internal$;
    private readonly public$;
    private readonly stop$;
    private isInitialized$;
    constructor({ refreshHandler, refreshInterval }: TagsCacheOptions);
    initialize(): Promise<void>;
    private refresh;
    getState(): Tag[];
    getState$({ waitForInitialization }?: {
        waitForInitialization?: boolean;
    }): Observable<Tag[]>;
    isInitialized(): boolean;
    onDidDelete(id: string): void;
    onDidCreate(tag: Tag): void;
    onDidUpdate(id: string, attributes: TagAttributes): void;
    onDidGetAll(tags: Tag[]): void;
    stop(): void;
}
