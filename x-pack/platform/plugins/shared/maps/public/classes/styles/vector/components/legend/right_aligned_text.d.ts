import type { CSSProperties } from 'react';
import React, { Component } from 'react';
interface Props {
    setWidth: (width: number) => void;
    style: CSSProperties;
    value: string | number;
    x: number;
    y: number;
}
export declare class RightAlignedText extends Component<Props> {
    private _textRef;
    componentDidMount(): void;
    componentDidUpdate(): void;
    _setWidth(): void;
    render(): React.JSX.Element;
}
export {};
