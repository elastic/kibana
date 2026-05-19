import type { ReactNode } from 'react';
import React from 'react';
import type { EuiLinkButtonProps, EuiPopoverProps, EuiWrappingPopoverProps } from '@elastic/eui';
import type { LensStartServices as StartServices } from '@kbn/lens-common';
export declare const HelpPopoverButton: ({ children, onClick, }: {
    children: string;
    onClick: EuiLinkButtonProps["onClick"];
}) => React.JSX.Element;
export declare const HelpPopover: ({ anchorPosition, button, children, closePopover, isOpen, title, }: {
    anchorPosition?: EuiPopoverProps["anchorPosition"];
    button: EuiPopoverProps["button"];
    children: ReactNode;
    closePopover: EuiPopoverProps["closePopover"];
    isOpen: EuiPopoverProps["isOpen"];
    title?: string;
}) => React.JSX.Element;
export declare const WrappingHelpPopover: ({ anchorPosition, button, children, closePopover, isOpen, title, startServices, }: {
    anchorPosition?: EuiWrappingPopoverProps["anchorPosition"];
    button: EuiWrappingPopoverProps["button"];
    children: ReactNode;
    closePopover: EuiWrappingPopoverProps["closePopover"];
    isOpen: EuiWrappingPopoverProps["isOpen"];
    title?: string;
    startServices: StartServices;
}) => React.JSX.Element;
