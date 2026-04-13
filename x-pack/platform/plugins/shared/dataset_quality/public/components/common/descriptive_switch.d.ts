import React from 'react';
interface DescriptiveSwitchProps {
    label: string;
    checked: boolean;
    tooltipText: string;
    onToggle: () => void;
    testSubject: string;
}
export declare const DescriptiveSwitch: ({ label, checked, tooltipText, onToggle, testSubject, }: DescriptiveSwitchProps) => React.JSX.Element;
export {};
