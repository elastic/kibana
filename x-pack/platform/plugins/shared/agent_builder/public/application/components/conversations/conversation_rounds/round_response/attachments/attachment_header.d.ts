import React from 'react';
import type { ActionButton } from '@kbn/agent-builder-browser/attachments';
export declare const HEADER_HEIGHT = 72;
interface AttachmentHeaderProps {
    title: string;
    actionButtons?: ActionButton[];
    onClose?: () => void;
    /**
     * Controls preview UI state from the parent.
     * - none: show regular action buttons
     * - preview_available: show "Preview Only" badge
     * - previewing: show "You're previewing this" and hide action buttons
     */
    previewBadgeState?: 'none' | 'preview_available' | 'previewing';
}
export declare const AttachmentHeader: React.FC<AttachmentHeaderProps>;
export {};
