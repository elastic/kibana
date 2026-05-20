import React from 'react';
import type { EuiComboBoxOptionOption, EuiComboBoxProps } from '@elastic/eui';
import type { FieldOptionValue } from '@kbn/visualization-ui-components';
import type { IndexPattern } from '@kbn/lens-common';
import type { OperationType } from '../form_based';
import type { OperationSupportMatrix } from './operation_support';
export type FieldChoiceWithOperationType = FieldOptionValue & {
    operationType: OperationType;
};
export interface FieldSelectProps extends EuiComboBoxProps<EuiComboBoxOptionOption['value']> {
    currentIndexPattern: IndexPattern;
    selectedOperationType?: OperationType;
    selectedField?: string;
    incompleteOperation?: OperationType;
    operationByField: OperationSupportMatrix['operationByField'];
    onChoose: (choice: FieldChoiceWithOperationType) => void;
    onDeleteColumn?: () => void;
    fieldIsInvalid: boolean;
    markAllFieldsCompatible?: boolean;
    'data-test-subj'?: string;
    showTimeSeriesDimensions: boolean;
    'aria-describedby'?: string;
    'aria-label'?: string;
}
export declare function FieldSelect({ currentIndexPattern, incompleteOperation, selectedOperationType, selectedField, operationByField, onChoose, onDeleteColumn, fieldIsInvalid, markAllFieldsCompatible, ['data-test-subj']: dataTestSub, showTimeSeriesDimensions, ['aria-describedby']: ariaDescribedby, ['aria-label']: ariaLabel, }: FieldSelectProps): React.JSX.Element;
