import type { FC } from 'react';
import type { ChromeBreadcrumb, CoreStart } from '@kbn/core/public';
import type { TagsCapabilities } from '../../common';
import type { ITagInternalClient, ITagAssignmentService, ITagsCache } from '../services';
interface TagManagementPageParams {
    setBreadcrumbs: (crumbs: ChromeBreadcrumb[]) => void;
    core: CoreStart;
    tagClient: ITagInternalClient;
    tagCache: ITagsCache;
    assignmentService: ITagAssignmentService;
    capabilities: TagsCapabilities;
    assignableTypes: string[];
}
export declare const TagManagementPage: FC<TagManagementPageParams>;
export {};
