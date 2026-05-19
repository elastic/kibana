import React from 'react';
import type { UnknownAttachment, ScreenContextAttachmentData } from '@kbn/agent-builder-common/attachments';
import type { AttachmentPreviewState } from '@kbn/agent-builder-browser/attachments';
import type { AttachmentsService } from '../../../../../../services/attachments/attachements_service';
interface InlineAttachmentWithActionsProps {
    attachment: UnknownAttachment;
    attachmentsService: AttachmentsService;
    isSidebar: boolean;
    conversationId: string;
    screenContext?: ScreenContextAttachmentData;
    /** Version number of the attachment being rendered, used for canvas preview comparison */
    version?: number;
    /**
     * Shared preview state for header actions/badges.
     */
    previewBadgeState?: AttachmentPreviewState;
}
/**
 * Component that renders an inline attachment with its action buttons.
 */
export declare const InlineAttachmentWithActions: React.FC<InlineAttachmentWithActionsProps>;
export {};
