import React, { Component } from 'react';
import type { MASK_OPERATOR } from '../../../../../../common/constants';
import type { IESAggField } from '../../../../fields/agg';
interface Props {
    esAggField: IESAggField;
    onlyShowLabelAndValue?: boolean;
    operator: MASK_OPERATOR;
    value: number;
}
interface State {
    aggLabel?: string;
}
export declare class MaskLegend extends Component<Props, State> {
    private _isMounted;
    state: State;
    componentDidMount(): void;
    componentWillUnmount(): void;
    componentDidUpdate(): void;
    _loadAggLabel: () => Promise<void>;
    _getBucketsName(): string | undefined;
    _getPrefix(): string;
    render(): React.JSX.Element;
}
export {};
