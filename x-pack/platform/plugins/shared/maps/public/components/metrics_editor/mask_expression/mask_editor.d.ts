import type { ChangeEvent } from 'react';
import React, { Component } from 'react';
import { MASK_OPERATOR } from '../../../../common/constants';
import type { AggDescriptor } from '../../../../common/descriptor_types';
interface Props {
    metric: AggDescriptor;
    onChange: (metric: AggDescriptor) => void;
    onClose: () => void;
}
interface State {
    operator: MASK_OPERATOR;
    value: number | string;
}
export declare class MaskEditor extends Component<Props, State> {
    constructor(props: Props);
    _onSet: () => void;
    _onClear: () => void;
    _onOperatorChange: (e: ChangeEvent<HTMLSelectElement>) => void;
    _onValueChange: (evt: ChangeEvent<HTMLInputElement>) => void;
    _hasChanges(): boolean;
    _isValueInValid(): boolean;
    _renderForm(): React.JSX.Element;
    _renderFooter(): React.JSX.Element;
    render(): React.JSX.Element;
}
export {};
