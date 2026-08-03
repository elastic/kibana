import type { Observable } from 'rxjs';
import type { TagsCapabilities } from '../../../common';
import type { ITagInternalClient, ITagAssignmentService, ITagsCache } from '../../services';
import type { StartServices } from '../../types';
import type { TagAction } from './types';
export type { TagAction } from './types';
interface GetActionsOptions {
    startServices: StartServices;
    capabilities: TagsCapabilities;
    tagClient: ITagInternalClient;
    tagCache: ITagsCache;
    assignmentService: ITagAssignmentService;
    setLoading: (loading: boolean) => void;
    assignableTypes: string[];
    fetchTags: () => Promise<void>;
    canceled$: Observable<void>;
}
export declare const getTableActions: ({ startServices, capabilities, tagClient, tagCache, assignmentService, assignableTypes, fetchTags, canceled$, }: GetActionsOptions) => TagAction[];
