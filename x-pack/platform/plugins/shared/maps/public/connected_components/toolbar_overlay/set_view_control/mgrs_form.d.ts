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
    mgrs: string;
    zoom: number | string;
}
export declare class MgrsForm extends Component<Props, State> {
    state: State;
    _toPoint(): any;
    _isMgrsInvalid(): boolean;
    _onMGRSChange: (evt: ChangeEvent<HTMLInputElement>) => void;
    _onZoomChange: (evt: ChangeEvent<HTMLInputElement>) => void;
    _onSubmit: () => void;
    render(): React.JSX.Element;
}
export {};
