import type { TagsCapabilities } from '../../../common';
import type { ITagInternalClient, ITagAssignmentService, ITagsCache } from '../../services';
import type { StartServices } from '../../types';
import type { TagBulkAction } from '../types';
interface GetBulkActionOptions {
    startServices: StartServices;
    capabilities: TagsCapabilities;
    tagClient: ITagInternalClient;
    tagCache: ITagsCache;
    assignmentService: ITagAssignmentService;
    clearSelection: () => void;
    setLoading: (loading: boolean) => void;
    assignableTypes: string[];
}
export declare const getBulkActions: ({ startServices, capabilities, tagClient, tagCache, assignmentService, clearSelection, setLoading, assignableTypes, }: GetBulkActionOptions) => TagBulkAction[];
export {};
