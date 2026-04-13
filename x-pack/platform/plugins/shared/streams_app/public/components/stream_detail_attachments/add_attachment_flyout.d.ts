import React from 'react';
import type { Attachment } from '@kbn/streams-plugin/server/lib/streams/attachments/types';
export declare function AddAttachmentFlyout({ entityId, onAddAttachments, isLoading, onClose, }: {
    entityId: string;
    onAddAttachments: (attachments: Attachment[]) => Promise<void>;
    isLoading: boolean;
    onClose: () => void;
}): React.JSX.Element;
