import React from 'react';
import type { UnknownAttachment, ScreenContextAttachmentData } from '@kbn/agent-builder-common/attachments';
import type { AttachmentPreviewState } from '@kbn/agent-builder-browser/attachments';
import type { AttachmentsService } from '../../../../../../services';
interface InlineAttachmentWithActionsProps {
    attachment: UnknownAttachment;
    attachmentsService: AttachmentsService;
    isSidebar: boolean;
    conversationId: string;
    screenContext?: ScreenContextAttachmentData;
    /**
     * Shared preview state for header actions/badges.
     */
    previewBadgeState?: AttachmentPreviewState;
}
export declare const InlineAttachmentWithActions: React.NamedExoticComponent<InlineAttachmentWithActionsProps>;
export {};
