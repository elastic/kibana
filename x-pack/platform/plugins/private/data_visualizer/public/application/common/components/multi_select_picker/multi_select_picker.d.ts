import type { FC, ReactNode } from 'react';
import React from 'react';
import type { SerializedStyles } from '@emotion/react';
export interface Option {
    name?: string | ReactNode;
    value: string;
    checked?: 'on' | 'off';
    disabled?: boolean;
}
interface MultiSelectPickerStyles {
    filterGroup?: SerializedStyles;
    filterItemContainer?: SerializedStyles;
}
export declare const MultiSelectPicker: FC<{
    options: Option[];
    onChange?: (items: string[]) => void;
    title?: string;
    checkedOptions: string[];
    dataTestSubj: string;
    postfix?: React.ReactElement;
    cssStyles?: MultiSelectPickerStyles;
}>;
export {};
