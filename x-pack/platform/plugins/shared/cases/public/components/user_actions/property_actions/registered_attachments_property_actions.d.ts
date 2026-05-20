import React from 'react';
import type { AttachmentAction } from '../../../client/attachment_framework/types';
interface Props {
    isLoading: boolean;
    registeredAttachmentActions: AttachmentAction[];
    onDelete: () => void;
    hideDefaultActions: boolean;
}
export declare const RegisteredAttachmentsPropertyActions: React.NamedExoticComponent<Props>;
export {};
