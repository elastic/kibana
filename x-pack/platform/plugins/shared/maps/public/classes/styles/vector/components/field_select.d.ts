import React from 'react';
import type { EuiComboBoxProps } from '@elastic/eui';
import type { VECTOR_STYLES } from '../../../../../common/constants';
import type { StyleField } from '../style_fields_helper';
type Props = {
    fields: StyleField[];
    selectedFieldName?: string;
    onChange: ({ field }: {
        field: StyleField | null;
    }) => void;
    styleName: VECTOR_STYLES;
} & Omit<EuiComboBoxProps<StyleField>, 'selectedOptions' | 'options' | 'onChange' | 'singleSelection' | 'isClearable' | 'fullWidth' | 'renderOption'>;
export declare function FieldSelect({ fields, selectedFieldName, onChange, styleName, ...rest }: Props): React.JSX.Element;
export {};
