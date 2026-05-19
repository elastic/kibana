import React, { Component } from 'react';
import type { Adapters } from '@kbn/inspector-plugin/public';
import type { Stats } from './types';
interface Props {
    adapters: Adapters;
}
interface State {
    stats: Stats;
    style: string;
}
export declare class MapViewComponent extends Component<Props, State> {
    state: State;
    _onMapChange: () => void;
    componentDidMount(): void;
    componentWillUnmount(): void;
    render(): React.JSX.Element;
}
export {};
