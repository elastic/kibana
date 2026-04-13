import type { Attachment } from '@kbn/streams-plugin/server/lib/streams/attachments/types';
import React from 'react';
interface AttachmentDetailsFlyoutProps {
    attachment: Attachment;
    streamName: string;
    onClose: () => void;
    onUnlink?: () => void;
}
export declare function AttachmentDetailsFlyout({ attachment, streamName, onClose, onUnlink, }: AttachmentDetailsFlyoutProps): React.JSX.Element;
export {};
