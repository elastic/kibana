import type { EuiComboBoxProps } from '@elastic/eui';
import React from 'react';
import type { Role } from '../../../common';
interface Props extends Omit<EuiComboBoxProps<string>, 'onChange' | 'options' | 'selectedOptions' | 'renderOption'> {
    availableRoles: Role[];
    selectedRoleNames: readonly string[];
    onChange: (selectedRoleNames: string[]) => void;
    placeholder?: string;
    isLoading?: boolean;
    isDisabled?: boolean;
}
export declare const RoleComboBox: (props: Props) => React.JSX.Element;
export {};
