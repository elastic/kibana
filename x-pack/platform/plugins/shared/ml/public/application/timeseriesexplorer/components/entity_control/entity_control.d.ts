import React, { Component } from 'react';
import type { EuiComboBoxOptionOption, EuiThemeComputed } from '@elastic/eui';
import { type MlEntityFieldType } from '@kbn/ml-anomaly-utils';
import type { UiPartitionFieldConfig } from '../series_controls/series_controls';
export interface Entity {
    fieldName: string;
    fieldType: MlEntityFieldType;
    fieldValue: any;
    fieldValues?: any;
}
/**
 * Configuration for entity field dropdown options
 */
export interface FieldConfig {
    isAnomalousOnly: boolean;
}
export type ComboBoxOption = EuiComboBoxOptionOption<{
    value: string | number;
    maxRecordScore?: number;
}>;
export interface EntityControlProps {
    entity: Entity;
    entityFieldValueChanged: (entity: Entity, fieldValue: string | number | null) => void;
    isLoading: boolean;
    onSearchChange: (entity: Entity, queryTerm: string) => void;
    config: UiPartitionFieldConfig;
    onConfigChange: (fieldType: MlEntityFieldType, config: Partial<UiPartitionFieldConfig>) => void;
    forceSelection: boolean;
    options: ComboBoxOption[];
    isModelPlotEnabled: boolean;
    euiTheme: EuiThemeComputed;
}
interface EntityControlState {
    selectedOptions: ComboBoxOption[] | undefined;
    isLoading: boolean;
    options: ComboBoxOption[] | undefined;
    isEntityConfigPopoverOpen: boolean;
}
export declare const EMPTY_FIELD_VALUE_LABEL: string;
export declare class EntityControl extends Component<EntityControlProps, EntityControlState> {
    inputRef: any;
    state: {
        selectedOptions: undefined;
        options: undefined;
        isLoading: boolean;
        isEntityConfigPopoverOpen: boolean;
    };
    componentDidUpdate(prevProps: EntityControlProps): void;
    onChange: (selectedOptions: ComboBoxOption[]) => void;
    onManualInput: (inputValue: string) => void;
    onSearchChange: (searchValue: string) => void;
    renderOption: (option: ComboBoxOption, searchValue: string) => React.JSX.Element;
    render(): React.JSX.Element;
}
export {};
