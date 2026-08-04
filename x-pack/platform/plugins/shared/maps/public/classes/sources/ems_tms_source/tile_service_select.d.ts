import type { ChangeEvent } from 'react';
import React, { Component } from 'react';
import type { EuiSelectOption } from '@elastic/eui';
import type { EMSTMSSourceDescriptor } from '../../../../common/descriptor_types';
export type EmsTmsSourceConfig = Pick<EMSTMSSourceDescriptor, 'id' | 'isAutoSelect'>;
interface Props {
    config?: EmsTmsSourceConfig;
    onTileSelect: (sourceConfig: EmsTmsSourceConfig) => void;
}
interface State {
    emsTmsOptions: EuiSelectOption[];
    hasLoaded: boolean;
}
export declare class TileServiceSelect extends Component<Props, State> {
    private _isMounted;
    state: State;
    componentWillUnmount(): void;
    componentDidMount(): void;
    _loadTmsOptions: () => Promise<void>;
    _onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
    render(): React.JSX.Element;
}
export {};
