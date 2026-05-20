import React from 'react';
import type { CustomIcon, MapCenter, MapSettings } from '../../../common/descriptor_types';
export interface Props {
    cancelChanges: () => void;
    center: MapCenter;
    hasMapSettingsChanges: boolean;
    keepChanges: () => void;
    settings: MapSettings;
    customIcons: CustomIcon[];
    updateMapSetting: (settingKey: string, settingValue: string | number | boolean | object) => void;
    updateCustomIcons: (customIcons: CustomIcon[]) => void;
    deleteCustomIcon: (symbolId: string) => void;
    zoom: number;
}
export declare function MapSettingsPanel({ cancelChanges, center, hasMapSettingsChanges, keepChanges, settings, customIcons, updateMapSetting, updateCustomIcons, deleteCustomIcon, zoom, }: Props): React.JSX.Element;
