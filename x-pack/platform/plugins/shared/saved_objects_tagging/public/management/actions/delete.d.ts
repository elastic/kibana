import type { NotificationsStart, OverlayStart } from '@kbn/core/public';
import type { ITagInternalClient } from '../../services/tags';
import type { TagAction } from './types';
interface GetDeleteActionOptions {
    overlays: OverlayStart;
    notifications: NotificationsStart;
    tagClient: ITagInternalClient;
    fetchTags: () => Promise<void>;
}
export declare const getDeleteAction: ({ notifications, overlays, tagClient, fetchTags, }: GetDeleteActionOptions) => TagAction;
export {};
