import type { FC } from 'react';
import type { NotificationsStart } from '@kbn/core/public';
import type { ITagAssignmentService, ITagsCache } from '../../services';
interface AssignFlyoutProps {
    tagIds: string[];
    allowedTypes: string[];
    assignmentService: ITagAssignmentService;
    notifications: NotificationsStart;
    tagCache: ITagsCache;
    onClose: () => Promise<void>;
}
export declare const AssignFlyout: FC<AssignFlyoutProps>;
export {};
