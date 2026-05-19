import _ from 'lodash';
import type { ChangeEvent } from 'react';
import React, { Component } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import type { IField } from '../../../fields/field';
interface Props {
    dataTestSubj: string;
    field: IField;
    getValueSuggestions: (query: string) => Promise<string[]>;
    onChange: (value: string) => void;
    value: string;
}
interface State {
    suggestions: string[];
    isLoadingSuggestions: boolean;
    hasPrevFocus: boolean;
    fieldDataType: string | null;
    localFieldTextValue: string;
    searchValue?: string;
}
export declare class StopInput extends Component<Props, State> {
    private _isMounted;
    constructor(props: Props);
    componentDidMount(): void;
    componentWillUnmount(): void;
    _loadFieldDataType(): Promise<void>;
    _onFocus: () => void;
    _onChange: (selectedOptions: Array<EuiComboBoxOptionOption<string>>) => void;
    _onCreateOption: (newValue: string) => void;
    _onSearchChange: (searchValue: string) => Promise<void>;
    _loadSuggestions: _.DebouncedFunc<(searchValue: string) => Promise<void>>;
    _onFieldTextChange: (event: ChangeEvent<HTMLInputElement>) => void;
    _debouncedOnFieldTextChange: _.DebouncedFunc<() => void>;
    _renderSuggestionInput(): React.JSX.Element;
    _renderTextInput(): React.JSX.Element;
    render(): React.JSX.Element | null;
}
export {};
