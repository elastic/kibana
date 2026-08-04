import React from 'react';
import type { MapCenter, MapSettings } from '../../../../common/descriptor_types';
interface SetViewFormProps {
    settings: MapSettings;
    zoom: number;
    center: MapCenter;
    onSubmit: (lat: number, lon: number, zoom: number) => void;
}
export declare const SetViewForm: React.NamedExoticComponent<SetViewFormProps>;
export {};
