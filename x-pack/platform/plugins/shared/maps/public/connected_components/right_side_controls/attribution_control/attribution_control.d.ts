import React, { Component } from 'react';
import type { Attribution } from '../../../../common/descriptor_types';
import type { ILayer } from '../../../classes/layers/layer';
export interface Props {
    isFullScreen: boolean;
    layerList: ILayer[];
}
interface State {
    uniqueAttributions: Attribution[];
}
export declare class AttributionControl extends Component<Props, State> {
    private _isMounted;
    state: {
        uniqueAttributions: never[];
    };
    componentDidMount(): void;
    componentWillUnmount(): void;
    componentDidUpdate(): void;
    _loadAttributions: () => Promise<void>;
    _renderAttribution({ url, label }: Attribution): string | React.JSX.Element;
    _renderAttributions(): React.JSX.Element[];
    render(): React.JSX.Element | null;
}
export {};
