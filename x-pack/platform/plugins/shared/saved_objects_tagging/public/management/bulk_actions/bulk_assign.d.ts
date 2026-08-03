import type { ITagsCache, ITagAssignmentService } from '../../services';
import type { StartServices } from '../../types';
import type { TagBulkAction } from '../types';
interface GetBulkAssignActionOptions extends StartServices {
    tagCache: ITagsCache;
    assignmentService: ITagAssignmentService;
    assignableTypes: string[];
    setLoading: (loading: boolean) => void;
}
export declare const getBulkAssignAction: ({ tagCache, assignmentService, assignableTypes, ...startServices }: GetBulkAssignActionOptions) => TagBulkAction;
export {};
