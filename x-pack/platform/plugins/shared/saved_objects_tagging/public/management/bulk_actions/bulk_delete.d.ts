import type { OverlayStart, NotificationsStart } from '@kbn/core/public';
import type { ITagInternalClient } from '../../services';
import type { TagBulkAction } from '../types';
interface GetBulkDeleteActionOptions {
    overlays: OverlayStart;
    notifications: NotificationsStart;
    tagClient: ITagInternalClient;
    setLoading: (loading: boolean) => void;
}
export declare const getBulkDeleteAction: ({ overlays, notifications, tagClient, setLoading, }: GetBulkDeleteActionOptions) => TagBulkAction;
export {};
