import React from 'react';
import type { ToolbarButtonProps } from './toolbar_button';
interface TriggerLabelProps {
    label: string;
    extraIcons?: Array<{
        component: React.ReactElement;
        value?: string;
        tooltipValue?: string;
        'data-test-subj': string;
    }>;
}
export type ChangeIndexPatternTriggerProps = ToolbarButtonProps & TriggerLabelProps & {
    label: string;
    title?: string;
    isDisabled?: boolean;
};
export declare function TriggerButton({ label, title, togglePopover, isMissingCurrent, extraIcons, ...rest }: ChangeIndexPatternTriggerProps & {
    togglePopover: () => void;
    isMissingCurrent?: boolean;
}): React.JSX.Element;
export {};
