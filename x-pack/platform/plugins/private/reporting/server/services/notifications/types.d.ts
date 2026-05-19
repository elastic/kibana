import type { RelatedSavedObject } from '@kbn/notifications-plugin/server/services/types';
import type { ReportingCore } from '../..';
export interface NotifyArgs {
    reporting: ReportingCore;
    index: string;
    id: string;
    contentType?: string | null;
    filename: string;
    relatedObject: RelatedSavedObject;
    emailParams: {
        to?: string[];
        bcc?: string[];
        cc?: string[];
        subject: string;
        message: string;
        spaceId?: string;
    };
}
export interface NotificationService {
    notify: (args: NotifyArgs) => Promise<void>;
}
