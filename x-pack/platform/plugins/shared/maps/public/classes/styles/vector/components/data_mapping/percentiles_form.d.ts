import React, { Component } from 'react';
interface Props {
    initialPercentiles: number[];
    onChange: (percentiles: number[]) => void;
}
interface State {
    percentiles: Array<number | string>;
}
export declare class PercentilesForm extends Component<Props, State> {
    constructor(props: Props);
    _onSubmit: () => void;
    render(): React.JSX.Element;
}
export {};
