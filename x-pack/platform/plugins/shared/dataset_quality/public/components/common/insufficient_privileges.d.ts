import React from 'react';
import type { EuiButtonIconProps, EuiButtonIconPropsForButton } from '@elastic/eui';
export declare const PrivilegesWarningIconWrapper: ({ hasPrivileges, title, mode, iconColor, popoverCss, children, }: {
    hasPrivileges: boolean;
    title: string;
    mode?: "tooltip" | "popover";
    iconColor?: EuiButtonIconPropsForButton["color"];
    popoverCss?: EuiButtonIconProps["css"];
    children: React.ReactNode;
}) => React.JSX.Element;
