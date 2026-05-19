import type { ComponentProps } from 'react';
import React, { Component } from 'react';
import { EuiDragDropContext } from '@elastic/eui';
import type { FieldProps } from './add_tooltip_field_popover';
import type { IField } from '../../classes/fields/field';
interface Props {
    fields: IField[] | null;
    onChange: (selectedFieldNames: string[]) => void;
    tooltipFields: IField[];
}
interface State {
    fieldProps: FieldProps[];
    selectedFieldProps: FieldProps[];
}
export declare class TooltipSelector extends Component<Props, State> {
    private _isMounted;
    private _previousFields;
    private _previousSelectedTooltips;
    state: {
        fieldProps: never[];
        selectedFieldProps: never[];
    };
    constructor(props: Props);
    componentDidMount(): void;
    componentWillUnmount(): void;
    componentDidUpdate(): void;
    _loadTooltipFieldProps(): Promise<void>;
    _loadFieldProps(): Promise<void>;
    _getPropertyLabel: (propertyName: string) => any;
    _getTooltipFieldNames(): string[];
    _onAdd: (properties: string[]) => void;
    _removeProperty: (index: number) => void;
    _onDragEnd: ComponentProps<typeof EuiDragDropContext>['onDragEnd'];
    _renderProperties(): React.JSX.Element;
    render(): React.JSX.Element;
}
export {};
