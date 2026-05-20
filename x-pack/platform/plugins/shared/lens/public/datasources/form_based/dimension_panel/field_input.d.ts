import React from 'react';
import type { GenericIndexPatternColumn, FieldBasedIndexPatternColumn } from '@kbn/lens-common';
import type { FieldInputProps } from '../operations/definitions';
export declare function FieldInput({ layer, selectedColumn, columnId, indexPattern, operationSupportMatrix, updateLayer, onDeleteColumn, incompleteField, incompleteOperation, incompleteParams, currentFieldIsInvalid, helpMessage, groupId, dimensionGroups, operationDefinitionMap, }: FieldInputProps<FieldBasedIndexPatternColumn>): React.JSX.Element;
export declare function getErrorMessage(selectedColumn: GenericIndexPatternColumn | undefined, incompleteOperation: boolean, input: 'none' | 'field' | 'fullReference' | 'managedReference' | undefined, fieldInvalid: boolean): string | undefined;
