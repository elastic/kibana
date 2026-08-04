import type { OverlayRef } from '@kbn/core/public';
import type { ITagAssignmentService, ITagsCache } from '../../services';
import type { StartServices } from '../../types';
export interface GetAssignFlyoutOpenerOptions extends StartServices {
    tagCache: ITagsCache;
    assignmentService: ITagAssignmentService;
    assignableTypes: string[];
}
export interface OpenAssignFlyoutOptions {
    /**
     * The list of tag ids to change assignments to.
     */
    tagIds: string[];
}
export type AssignFlyoutOpener = (options: OpenAssignFlyoutOptions) => Promise<OverlayRef>;
export declare const getAssignFlyoutOpener: ({ overlays, notifications, rendering, tagCache, assignmentService, assignableTypes, }: GetAssignFlyoutOpenerOptions) => AssignFlyoutOpener;
