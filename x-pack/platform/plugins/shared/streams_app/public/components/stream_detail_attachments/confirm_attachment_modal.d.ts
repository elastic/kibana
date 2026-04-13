import type { Attachment } from '@kbn/streams-plugin/server/lib/streams/attachments/types';
import React from 'react';
interface ConfirmAttachmentModalProps {
    attachments: Attachment[];
    onConfirm: () => void;
    onCancel: () => void;
    isLoading?: boolean;
}
export declare function ConfirmAttachmentModal({ attachments, onConfirm, onCancel, isLoading, }: ConfirmAttachmentModalProps): React.JSX.Element;
export {};
