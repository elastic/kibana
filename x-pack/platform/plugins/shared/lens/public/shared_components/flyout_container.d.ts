import React from 'react';
import type { Interpolation, Theme } from '@emotion/react';
export declare function FlyoutContainer({ isOpen, label, handleClose, isFullscreen, panelRef, panelContainerRef, children, customFooter, isInlineEditing, overrideContainerCss, }: {
    isOpen: boolean;
    handleClose: () => void;
    children: React.ReactElement | null;
    label: string;
    isFullscreen?: boolean;
    panelRef?: (el: HTMLDivElement) => void;
    panelContainerRef?: (el: HTMLDivElement) => void;
    customFooter?: React.ReactElement;
    isInlineEditing?: boolean;
    overrideContainerCss?: Interpolation<Theme>;
}): React.JSX.Element | null;
