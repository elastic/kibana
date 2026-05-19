import React from 'react';
export type LabelMode = 'auto' | 'custom' | 'none';
export interface Label {
    mode: LabelMode;
    label: string | undefined;
}
export interface VisLabelProps {
    label: string | undefined;
    mode: LabelMode;
    handleChange: (label: Label) => void;
    placeholder?: string;
    hasAutoOption?: boolean;
    header?: string;
    dataTestSubj?: string;
}
export declare function VisLabel({ label, mode, handleChange, hasAutoOption, placeholder, header, dataTestSubj, }: VisLabelProps): React.JSX.Element;
