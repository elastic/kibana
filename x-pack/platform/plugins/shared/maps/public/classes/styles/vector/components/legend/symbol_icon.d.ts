import type { CSSProperties } from 'react';
import React, { Component } from 'react';
import type { CommonProps } from '@elastic/eui';
interface Props extends CommonProps {
    symbolId: string;
    fill?: string;
    stroke?: string;
    style?: CSSProperties;
    svg: string;
}
interface State {
    imgDataUrl: string | null;
}
export declare class SymbolIcon extends Component<Props, State> {
    private _isMounted;
    state: State;
    componentDidMount(): void;
    componentWillUnmount(): void;
    _loadSymbol(): Promise<void>;
    render(): React.JSX.Element | null;
}
export {};
