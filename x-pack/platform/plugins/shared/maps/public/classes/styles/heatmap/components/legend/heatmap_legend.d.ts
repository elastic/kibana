import React, { Component } from 'react';
import type { IField } from '../../../../fields/field';
interface Props {
    colorRampName: string;
    field: IField;
}
interface State {
    label: string;
}
export declare class HeatmapLegend extends Component<Props, State> {
    private _isMounted;
    state: State;
    componentDidUpdate(): void;
    componentDidMount(): void;
    componentWillUnmount(): void;
    _loadLabel(): Promise<void>;
    render(): React.JSX.Element;
}
export {};
