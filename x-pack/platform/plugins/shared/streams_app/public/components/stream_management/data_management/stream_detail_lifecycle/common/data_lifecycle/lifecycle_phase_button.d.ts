import React from 'react';
import type { EuiThemeComputed } from '@elastic/eui';
interface LifecyclePhaseButtonProps {
    euiTheme: EuiThemeComputed;
    isDelete: boolean;
    isPopoverOpen: boolean;
    isBeingEdited?: boolean;
    label: string;
    onClick: () => void;
    phaseColor?: string;
    size?: string;
    testSubjPrefix?: string;
    isEditLifecycleFlyoutOpen?: boolean;
}
export declare const LifecyclePhaseButton: ({ euiTheme, isDelete, isPopoverOpen, isBeingEdited, label, onClick, phaseColor, size, testSubjPrefix, isEditLifecycleFlyoutOpen, }: LifecyclePhaseButtonProps) => React.JSX.Element;
export {};
