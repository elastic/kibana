import React from 'react';
import type { EuiComboBoxOptionOption, EuiComboBoxProps } from '@elastic/eui';
import type { DatatableColumn } from '@kbn/expressions-plugin/public';
import type { FieldOptionValue } from '@kbn/visualization-ui-components';
import type { TextBasedLayerColumn } from '@kbn/lens-common';
export interface FieldOptionCompatible extends DatatableColumn {
    compatible: boolean;
}
export interface FieldSelectProps extends EuiComboBoxProps<EuiComboBoxOptionOption['value']> {
    selectedField?: TextBasedLayerColumn;
    onChoose: (choice: FieldOptionValue) => void;
    existingFields: FieldOptionCompatible[];
}
export declare function FieldSelect({ selectedField, onChoose, existingFields, ['data-test-subj']: dataTestSub, }: FieldSelectProps): React.JSX.Element;
