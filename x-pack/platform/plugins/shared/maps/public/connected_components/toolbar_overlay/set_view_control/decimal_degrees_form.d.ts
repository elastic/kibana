import type { ChangeEvent } from 'react';
import React, { Component } from 'react';
import type { MapCenter, MapSettings } from '../../../../common/descriptor_types';
interface Props {
    settings: MapSettings;
    zoom: number;
    center: MapCenter;
    onSubmit: (lat: number, lon: number, zoom: number) => void;
}
interface State {
    lat: number | string;
    lon: number | string;
    zoom: number | string;
}
export declare class DecimalDegreesForm extends Component<Props, State> {
    state: State;
    _onLatChange: (evt: ChangeEvent<HTMLInputElement>) => void;
    _onLonChange: (evt: ChangeEvent<HTMLInputElement>) => void;
    _onZoomChange: (evt: ChangeEvent<HTMLInputElement>) => void;
    _onSubmit: () => void;
    render(): React.JSX.Element;
}
export {};
