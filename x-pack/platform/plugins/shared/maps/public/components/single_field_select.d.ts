import React from 'react';
import type { EuiComboBoxProps } from '@elastic/eui';
import type { DataViewField } from '@kbn/data-views-plugin/public';
export type Props = Omit<EuiComboBoxProps<DataViewField>, 'isDisabled' | 'onChange' | 'options' | 'renderOption' | 'selectedOptions' | 'singleSelection'> & {
    fields?: DataViewField[];
    onChange: (fieldName?: string) => void;
    value: string | null;
    isFieldDisabled?: (field: DataViewField) => boolean;
    getFieldDisabledReason?: (field: DataViewField) => string | null;
};
export declare function SingleFieldSelect({ fields, getFieldDisabledReason, isFieldDisabled, onChange, value, ...rest }: Props): React.JSX.Element;
