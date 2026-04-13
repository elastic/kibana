import React from 'react';
import type { Attachment } from '@kbn/streams-plugin/server/lib/streams/attachments/types';
interface BaseAttachmentsTableProps {
    entityId?: string;
    loading: boolean;
    attachments: Attachment[];
    compact?: boolean;
    selectedAttachments?: Attachment[];
    setSelectedAttachments?: (attachments: Attachment[]) => void;
    onUnlinkAttachment?: (attachment: Attachment) => void;
    dataTestSubj?: string;
    selectionDisabled?: boolean;
}
interface WithActionsProps extends BaseAttachmentsTableProps {
    showActions: true;
    onViewDetails: (attachment: Attachment) => void;
}
interface WithoutActionsProps extends BaseAttachmentsTableProps {
    showActions?: false;
    onViewDetails?: never;
}
type AttachmentsTableProps = WithActionsProps | WithoutActionsProps;
export declare function AttachmentsTable({ attachments, compact, showActions, selectedAttachments, setSelectedAttachments, onUnlinkAttachment, onViewDetails, loading, entityId, dataTestSubj, selectionDisabled, }: AttachmentsTableProps): React.JSX.Element;
export {};
