import React from 'react';
import type { MapCenter, MapSettings } from '../../../common/descriptor_types';
interface Props {
    center: MapCenter;
    settings: MapSettings;
    updateMapSetting: (settingKey: string, settingValue: string | number | boolean | object) => void;
    zoom: number;
}
export declare function NavigationPanel({ center, settings, updateMapSetting, zoom }: Props): React.JSX.Element;
export {};
