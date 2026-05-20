import type { FC } from 'react';
import type { EuiComboBoxOptionOption, EuiComboBoxSingleSelectionShape, EuiFormControlLayoutProps } from '@elastic/eui';
import type { DropDownLabel } from './types';
export declare const optionCss: import("@emotion/react").SerializedStyles;
interface OptionListWithFieldStatsProps extends Pick<EuiFormControlLayoutProps, 'prepend' | 'compressed'> {
    options: DropDownLabel[];
    placeholder?: string;
    'aria-label'?: string;
    singleSelection?: boolean | EuiComboBoxSingleSelectionShape;
    onChange: ((newSuggestions: DropDownLabel[]) => void) | ((newSuggestions: EuiComboBoxOptionOption[]) => void);
    selectedOptions?: Array<{
        label: string;
    }>;
    fullWidth?: boolean;
    isDisabled?: boolean;
    isLoading?: boolean;
    isClearable?: boolean;
    isInvalid?: boolean;
    'data-test-subj'?: string;
    titleId?: string;
}
export declare const OptionListWithFieldStats: FC<OptionListWithFieldStatsProps>;
export {};
