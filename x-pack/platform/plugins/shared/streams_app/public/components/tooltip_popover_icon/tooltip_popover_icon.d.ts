import React from 'react';
import type { EuiButtonIconProps, EuiButtonIconPropsForButton, IconType } from '@elastic/eui';
export declare const TooltipOrPopoverIcon: ({ title, mode, icon, iconColor, popoverCss, dataTestSubj, children, }: {
    title: string;
    mode?: "tooltip" | "popover";
    icon: IconType;
    iconColor?: EuiButtonIconPropsForButton["color"];
    popoverCss?: EuiButtonIconProps["css"];
    dataTestSubj: string;
    children?: React.ReactNode;
}) => React.JSX.Element;
