import React, { Component } from 'react';
import type { MapCenter, MapSettings } from '../../../../common/descriptor_types';
export interface Props {
    settings: MapSettings;
    zoom: number;
    center: MapCenter;
    onSubmit: ({ lat, lon, zoom }: {
        lat: number;
        lon: number;
        zoom: number;
    }) => void;
}
interface State {
    isPopoverOpen: boolean;
}
export declare class SetViewControl extends Component<Props, State> {
    state: State;
    _togglePopover: () => void;
    _closePopover: () => void;
    _onSubmit: (lat: number, lon: number, zoom: number) => void;
    render(): React.JSX.Element;
}
export {};
