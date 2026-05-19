import React from 'react';
import type { IndexPattern, TermsIndexPatternColumn } from '@kbn/lens-common';
import type { OperationSupportMatrix } from '../../../dimension_panel';
export declare const MAX_MULTI_FIELDS_SIZE = 3;
export interface FieldInputsProps {
    column: TermsIndexPatternColumn;
    indexPattern: IndexPattern;
    invalidFields?: string[];
    operationSupportMatrix: Pick<OperationSupportMatrix, 'operationByField'>;
    onChange: (newValues: string[]) => void;
    showTimeSeriesDimensions: boolean;
}
export declare function FieldInputs({ column, onChange, indexPattern, operationSupportMatrix, invalidFields, showTimeSeriesDimensions, }: FieldInputsProps): React.JSX.Element;
export declare function getInputFieldErrorMessage(isScriptedField: boolean, invalidFields: string[]): string | undefined;
