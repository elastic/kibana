import type { Observable } from 'rxjs';
import type { ITagAssignmentService } from '../../services/assignments';
import type { ITagsCache } from '../../services/tags';
import type { StartServices } from '../../types';
import type { TagAction } from './types';
interface GetAssignActionOptions extends StartServices {
    tagCache: ITagsCache;
    assignmentService: ITagAssignmentService;
    assignableTypes: string[];
    fetchTags: () => Promise<void>;
    canceled$: Observable<void>;
}
export declare const getAssignAction: ({ assignableTypes, assignmentService, tagCache, fetchTags, canceled$, ...startServices }: GetAssignActionOptions) => TagAction;
export {};
