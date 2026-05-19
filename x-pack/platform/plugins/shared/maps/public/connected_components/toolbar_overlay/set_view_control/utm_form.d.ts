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
    northing: string;
    easting: string;
    zone: string;
    zoom: number | string;
}
export declare class UtmForm extends Component<Props, State> {
    constructor(props: Props);
    _toPoint(): any;
    _isUtmInvalid(): boolean;
    _onZoneChange: (evt: ChangeEvent<HTMLInputElement>) => void;
    _onEastingChange: (evt: ChangeEvent<HTMLInputElement>) => void;
    _onNorthingChange: (evt: ChangeEvent<HTMLInputElement>) => void;
    _onZoomChange: (evt: ChangeEvent<HTMLInputElement>) => void;
    _onSubmit: () => void;
    render(): React.JSX.Element;
}
export {};
