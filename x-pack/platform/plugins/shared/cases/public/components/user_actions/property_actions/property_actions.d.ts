import React from 'react';
import type { AttachmentAction } from '../../../client/attachment_framework/types';
interface Props {
    isLoading: boolean;
    propertyActions: AttachmentAction[];
    customDataTestSubj?: string;
    buttonRef?: React.Ref<HTMLAnchorElement>;
}
export declare const UserActionPropertyActions: React.NamedExoticComponent<Props>;
export {};
