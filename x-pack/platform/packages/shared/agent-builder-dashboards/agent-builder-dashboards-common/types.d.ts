import type { Attachment, AttachmentInput } from '@kbn/agent-builder-common/attachments';
import type { DASHBOARD_ATTACHMENT_TYPE } from './constants';
import type { DashboardAttachmentData, AttachmentPanel, DashboardSection } from './dashboard_schema_types';
import { dashboardAttachmentDataSchema, panelGridSchema, sectionGridSchema, timeRangeSchema, isSection } from './dashboard_schema_types';
export type { DashboardAttachmentData, AttachmentPanel, DashboardSection };
export { dashboardAttachmentDataSchema, panelGridSchema, sectionGridSchema, timeRangeSchema, isSection, };
export type DashboardAttachment = Attachment<typeof DASHBOARD_ATTACHMENT_TYPE, DashboardAttachmentData>;
/**
 * Represents a pending dashboard attachment input.
 * Used when creating attachments before they're persisted to a conversation.
 */
export type PendingDashboardAttachment = AttachmentInput<typeof DASHBOARD_ATTACHMENT_TYPE, DashboardAttachmentData>;
