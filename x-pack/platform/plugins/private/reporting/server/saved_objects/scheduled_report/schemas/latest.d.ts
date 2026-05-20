import type { TypeOf } from '@kbn/config-schema';
import { rawNotificationSchema, rawScheduledReportSchema, rawEmailNotificationSchema } from './v5';
export type RawNotification = TypeOf<typeof rawNotificationSchema>;
export type RawScheduledReport = TypeOf<typeof rawScheduledReportSchema>;
export { rawNotificationSchema, rawScheduledReportSchema, rawEmailNotificationSchema };
