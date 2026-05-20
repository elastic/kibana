import type { IBasePath, Logger } from '@kbn/core/server';
import type { NotificationsPluginStart } from '@kbn/notifications-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type { NotificationService, NotifyAssigneesArgs } from './types';
export declare class EmailNotificationService implements NotificationService {
    private readonly logger;
    private readonly notifications;
    private readonly security;
    private readonly spaceId;
    private readonly publicBaseUrl?;
    constructor({ logger, notifications, security, publicBaseUrl, spaceId, }: {
        logger: Logger;
        notifications: NotificationsPluginStart;
        security: SecurityPluginStart;
        spaceId: string;
        publicBaseUrl?: IBasePath['publicBaseUrl'];
    });
    private static getCaseUrl;
    private static getTitle;
    private static getPlainTextMessage;
    private static getHTMLMessage;
    notifyAssignees({ assignees, theCase }: NotifyAssigneesArgs): Promise<void>;
    bulkNotifyAssignees(casesAndAssigneesToNotifyForAssignment: NotifyAssigneesArgs[]): Promise<void>;
}
