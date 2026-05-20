import React, { Component } from 'react';
import type { IDynamicStyleProperty } from '../../../properties/dynamic_style_property';
interface Props {
    style: IDynamicStyleProperty<any>;
}
interface State {
    label: string;
}
export declare class OrdinalLegend extends Component<Props, State> {
    private _isMounted;
    state: State;
    componentDidMount(): void;
    componentDidUpdate(): void;
    componentWillUnmount(): void;
    _loadLabel(): Promise<void>;
    _formatValue(value: string | number): string | number;
    _renderRangeLegendHeader(): React.JSX.Element | null;
    render(): React.JSX.Element | null;
}
export {};
