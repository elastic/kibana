import React, { Component } from 'react';
import type { EmsTmsSourceConfig } from './tile_service_select';
interface Props {
    onTileSelect: (sourceConfig: EmsTmsSourceConfig) => void;
}
interface State {
    config?: EmsTmsSourceConfig;
}
export declare class CreateSourceEditor extends Component<Props, State> {
    state: State;
    componentDidMount(): void;
    _onTileSelect: (config: EmsTmsSourceConfig) => void;
    render(): React.JSX.Element;
}
export {};
