import React from 'react';
import type { AttachmentsService } from '../../../../../../services/attachments/attachements_service';
interface CanvasFlyoutProps {
    attachmentsService: AttachmentsService;
}
/**
 * Flyout component for displaying attachments in canvas mode (expanded view).
 * Consumes canvas state from context. In full-screen context, renders at 50% screen width.
 * In sidebar context, uses default flyout width.
 */
export declare const CanvasFlyout: React.FC<CanvasFlyoutProps>;
export {};
