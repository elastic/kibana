import React from 'react';
import type { EuiButtonProps } from '@elastic/eui';
import type { AttachmentAction } from '../../client/attachment_framework/types';
export interface PropertyActionButtonProps {
    disabled?: boolean;
    onClick: () => void;
    iconType: string;
    label: string;
    color?: EuiButtonProps['color'];
    customDataTestSubj?: string;
}
export interface PropertyActionsProps {
    propertyActions: AttachmentAction[];
    customDataTestSubj?: string;
    buttonRef?: React.Ref<HTMLAnchorElement>;
}
export declare const PropertyActions: React.NamedExoticComponent<PropertyActionsProps>;
