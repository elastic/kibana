import React, { Component } from 'react';
import type { ITermJoinSource } from '../../sources/join_sources';
interface Props {
    leftFieldName: string;
    termJoins: ITermJoinSource[];
}
interface State {
    rightSourceLabels: string[];
}
export declare class TermJoinKeyLabel extends Component<Props, State> {
    private _isMounted;
    state: State;
    componentDidMount(): void;
    componentWillUnmount(): void;
    _loadRightSourceLabels(): Promise<void>;
    render(): string | React.JSX.Element;
}
export {};
