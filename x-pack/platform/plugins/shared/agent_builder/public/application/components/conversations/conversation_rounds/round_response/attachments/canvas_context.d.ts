import React from 'react';
import type { UnknownAttachment } from '@kbn/agent-builder-common/attachments';
interface CanvasState {
    attachment: UnknownAttachment;
    isSidebar: boolean;
    version?: number;
}
export declare const getAttachmentPreviewKey: (attachmentId: string, version?: number) => string;
interface CanvasContextValue {
    canvasState: CanvasState | null;
    previewedAttachmentKey: string | null;
    openCanvas: (attachment: UnknownAttachment, isSidebar: boolean, version?: number) => void;
    closeCanvas: () => void;
    setCanvasAttachmentOrigin: (origin: string) => void;
    setPreviewedAttachmentKey: (attachmentKey: string | null) => void;
}
interface CanvasProviderProps {
    children: React.ReactNode;
}
export declare const CanvasProvider: React.FC<CanvasProviderProps>;
export declare const useCanvasContext: () => CanvasContextValue;
export {};
