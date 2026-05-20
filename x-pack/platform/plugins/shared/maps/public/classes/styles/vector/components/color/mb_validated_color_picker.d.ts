import React, { Component } from 'react';
import type { EuiFormControlLayoutProps } from '@elastic/eui';
export declare const RGBA_0000 = "rgba(0,0,0,0)";
interface Props {
    onChange: (color: string) => void;
    color: string;
    swatches?: string[];
    append?: EuiFormControlLayoutProps['append'];
    prepend?: EuiFormControlLayoutProps['prepend'];
}
interface State {
    colorInputValue: string;
}
export declare class MbValidatedColorPicker extends Component<Props, State> {
    state: {
        colorInputValue: string;
    };
    _onColorChange: (color: string) => void;
    render(): React.JSX.Element;
}
export {};
