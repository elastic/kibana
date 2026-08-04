import React from 'react';
import type { MapSettings } from '../../../common/descriptor_types';
interface Props {
    settings: MapSettings;
    updateMapSetting: (settingKey: string, settingValue: string | number | boolean) => void;
}
export declare function SpatialFiltersPanel({ settings, updateMapSetting }: Props): React.JSX.Element;
export {};
