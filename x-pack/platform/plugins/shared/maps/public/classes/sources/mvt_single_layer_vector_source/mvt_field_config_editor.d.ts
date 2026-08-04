import React, { Component } from 'react';
import _ from 'lodash';
import type { MVTFieldDescriptor } from '../../../../common/descriptor_types';
interface Props {
    fields: MVTFieldDescriptor[];
    onChange: (fields: MVTFieldDescriptor[]) => void;
}
interface State {
    currentFields: MVTFieldDescriptor[];
}
export declare class MVTFieldConfigEditor extends Component<Props, State> {
    state: State;
    _notifyChange: _.DebouncedFunc<() => void>;
    _fieldChange(newFields: MVTFieldDescriptor[]): void;
    _removeField(index: number): void;
    _addField: () => void;
    _renderFieldTypeDropDown(mvtFieldConfig: MVTFieldDescriptor, index: number): React.JSX.Element;
    _renderFieldButtonDelete(index: number): React.JSX.Element;
    _renderFieldNameInput(mvtFieldConfig: MVTFieldDescriptor, index: number): React.JSX.Element;
    _renderFieldConfig(): React.JSX.Element[];
    render(): React.JSX.Element;
}
export {};
