import React, { Component } from 'react';
import type { CustomIcon, IconDynamicOptions, IconStop } from '../../../../../../common/descriptor_types';
import { ICON_SOURCE } from '../../../../../../common/constants';
import type { IDynamicStyleProperty } from '../../properties/dynamic_style_property';
export interface StyleOptionChanges {
    customIconStops?: IconStop[];
    iconPaletteId?: string | null;
    useCustomIconMap: boolean;
}
interface Props {
    customIconStops?: IconStop[];
    iconPaletteId: string | null;
    customIcons: CustomIcon[];
    onCustomIconsChange: (customIcons: CustomIcon[]) => void;
    onChange: ({ customIconStops, iconPaletteId, useCustomIconMap }: StyleOptionChanges) => void;
    styleProperty: IDynamicStyleProperty<IconDynamicOptions>;
    useCustomIconMap?: boolean;
    isCustomOnly: boolean;
}
interface State {
    customIconStops: IconStop[];
}
export declare class IconMapSelect extends Component<Props, State> {
    state: {
        customIconStops: Readonly<{
            iconSource?: ICON_SOURCE | undefined;
        } & {
            stop: string | null;
            icon: string;
        }>[];
    };
    _onMapSelect: (selectedValue: string) => void;
    _onCustomMapChange: ({ customStops, isInvalid, }: {
        customStops: IconStop[];
        isInvalid: boolean;
    }) => void;
    _renderCustomStopsInput(): React.JSX.Element | null;
    _renderMapSelect(): React.JSX.Element | null;
    render(): React.JSX.Element;
}
export {};
