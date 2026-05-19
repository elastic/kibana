import type { PropsWithChildren } from 'react';
import React from 'react';
import type { EuiPopoverProps, IconType } from '@elastic/eui';
import type { ToolbarButtonProps } from '@kbn/shared-ux-button-toolbar';
export type ToolbarPopoverProps = Partial<EuiPopoverProps> & {
    /**
     * Determines popover title
     */
    title: string;
    /**
     * Determines the button icon
     */
    type: 'legend' | 'values' | IconType;
    /**
     * Determines if the popover is disabled
     */
    isDisabled?: boolean;
    /**
     * Button group position
     */
    groupPosition?: ToolbarButtonProps<'iconButton'>['groupPosition'];
    buttonDataTestSubj?: string;
    panelClassName?: string;
    handleClose?: () => void;
};
export declare const ToolbarPopover: React.FC<PropsWithChildren<ToolbarPopoverProps>>;
