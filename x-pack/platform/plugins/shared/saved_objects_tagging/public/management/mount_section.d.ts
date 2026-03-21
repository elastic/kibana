import type { CoreSetup } from '@kbn/core/public';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import type { SavedObjectTaggingPluginStart } from '../types';
import type { ITagInternalClient, ITagAssignmentService, ITagsCache } from '../services';
interface MountSectionParams {
    tagClient: ITagInternalClient;
    tagCache: ITagsCache;
    assignmentService: ITagAssignmentService;
    core: CoreSetup<{}, SavedObjectTaggingPluginStart>;
    mountParams: ManagementAppMountParams;
    title: string;
}
export declare const mountSection: ({ tagClient, tagCache, assignmentService, core, mountParams, title, }: MountSectionParams) => Promise<() => void>;
export {};
