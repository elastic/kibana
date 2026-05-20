import React, { Component } from 'react';
import type { ScopedHistory } from '@kbn/core/public';
interface Props {
    history: ScopedHistory;
}
declare class AppComponent extends Component<Props> {
    constructor(props: Props);
    registerRouter(): void;
    componentDidMount(): void;
    componentWillUnmount(): void;
    render(): React.JSX.Element;
}
export declare const App: typeof AppComponent;
export {};
