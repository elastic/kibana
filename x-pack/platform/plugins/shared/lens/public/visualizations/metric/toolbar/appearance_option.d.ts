import type { ReactNode } from 'react';
import React from 'react';
import type { EuiButtonGroupOptionProps } from '@elastic/eui';
export declare function AppearanceOptionGroup({ title, children }: {
    title: string;
    children: ReactNode;
}): React.JSX.Element;
export declare function SubtitleOption({ value, onChange, isDisabled, }: {
    value?: string;
    onChange: (subtitle: string) => void;
    isDisabled: boolean | string;
}): React.JSX.Element;
interface AppearanceOptionProps<OptionType extends string> {
    label: string;
    value: OptionType;
    options: Array<EuiButtonGroupOptionProps & {
        id: OptionType;
    }>;
    onChange: (id: OptionType) => void;
    isDisabled?: boolean;
    isIconOnly?: boolean;
    dataTestSubj?: string;
}
export declare function AppearanceOption<OptionType extends string>({ label, value, options, onChange, isDisabled, isIconOnly, dataTestSubj, }: AppearanceOptionProps<OptionType>): React.JSX.Element;
export {};
