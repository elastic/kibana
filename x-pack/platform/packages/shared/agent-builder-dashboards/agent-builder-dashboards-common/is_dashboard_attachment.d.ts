import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { DASHBOARD_ATTACHMENT_TYPE } from './constants';
import type { DashboardAttachmentData } from './types';
export declare const isDashboardAttachment: (attachment: VersionedAttachment) => attachment is VersionedAttachment<typeof DASHBOARD_ATTACHMENT_TYPE, DashboardAttachmentData>;
