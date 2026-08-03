import React from 'react';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
export interface StaleAttachmentsPanelProps {
    attachmentInputs: AttachmentInput[];
    onAddToInput: () => void;
    onDismiss: () => void;
}
export declare const StaleAttachmentsPanel: React.FC<StaleAttachmentsPanelProps>;
