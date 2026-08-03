import type { ReactElement } from 'react';
import React, { Component } from 'react';
import type { IDynamicStyleProperty } from '../../properties/dynamic_style_property';
export interface Break {
    color: string;
    label: ReactElement<any> | string | number;
    svg?: string;
    symbolId?: string;
}
interface Props {
    style: IDynamicStyleProperty<any>;
    breaks: Break[];
    isLinesOnly: boolean;
    isPointsOnly: boolean;
}
interface State {
    label: string;
}
export declare class BreakedLegend extends Component<Props, State> {
    private _isMounted;
    state: State;
    componentDidMount(): void;
    componentDidUpdate(): void;
    componentWillUnmount(): void;
    _loadLabel(): Promise<void>;
    render(): React.JSX.Element | null;
}
export {};
