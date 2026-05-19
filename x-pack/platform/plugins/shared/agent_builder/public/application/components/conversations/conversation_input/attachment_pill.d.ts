import React from 'react';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
export interface AttachmentPillProps {
    attachment: Attachment;
    onRemoveAttachment?: () => void;
}
export declare const AttachmentPill: React.FC<AttachmentPillProps>;
