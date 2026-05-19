import type { NotificationsPluginStart } from '@kbn/notifications-plugin/server';
import type { NotificationService, NotifyArgs } from './types';
export interface Attachment {
    content: string;
    contentType?: string;
    encoding?: string;
    filename: string;
}
export declare class EmailNotificationService implements NotificationService {
    private readonly notifications;
    constructor({ notifications }: {
        notifications: NotificationsPluginStart;
    });
    private getAttachments;
    notify({ reporting, index, id, contentType, filename, relatedObject, emailParams, }: NotifyArgs): Promise<void>;
}
