import React from 'react';
import type { ActionButton, HeaderBadge } from '@kbn/agent-builder-browser/attachments';
import type { IconType } from '@elastic/eui';
export declare const HEADER_HEIGHT = 72;
interface AttachmentHeaderProps {
    icon?: IconType;
    title: string;
    /** Optional subtitle rendered under the title. */
    subtitle?: string;
    /** Optional badges rendered alongside the title. */
    badges?: HeaderBadge[];
    actionButtons?: ActionButton[];
    onClose?: () => void;
    onClosePreview?: () => void;
    /**
     * Controls preview UI state from the parent.
     * - none: show regular action buttons
     * - preview_available: show "Preview Only" badge
     * - previewing: show "Close preview" button and hide action buttons
     */
    previewBadgeState?: 'none' | 'preview_available' | 'previewing';
}
export declare const COMPACT_WIDTH_THRESHOLD = 560;
export declare const AttachmentHeader: React.FC<AttachmentHeaderProps>;
export {};
