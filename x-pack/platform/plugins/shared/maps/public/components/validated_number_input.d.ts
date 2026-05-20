import type { ChangeEvent, ReactNode } from 'react';
import React, { Component } from 'react';
import type { EuiFormRowDisplayKeys } from '@elastic/eui/src/components/form/form_row/form_row';
import _ from 'lodash';
interface State {
    value: number | string;
    errorMessage: string;
    isValid: boolean;
}
interface Props {
    initialValue: number;
    min: number;
    max: number;
    onChange: (value: number) => void;
    label: string;
    display?: EuiFormRowDisplayKeys;
    helpText?: ReactNode;
}
export declare class ValidatedNumberInput extends Component<Props, State> {
    constructor(props: Props);
    _submit: _.DebouncedFunc<(value: any) => void>;
    _onChange: (e: ChangeEvent<HTMLInputElement>) => void;
    render(): React.JSX.Element;
}
export {};
