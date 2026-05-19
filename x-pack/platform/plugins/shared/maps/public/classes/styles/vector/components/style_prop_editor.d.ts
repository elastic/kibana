import type { ReactElement } from 'react';
import React, { Component } from 'react';
import type { VECTOR_STYLES } from '../../../../../common/constants';
import type { CustomIcon } from '../../../../../common/descriptor_types';
import type { IStyleProperty } from '../properties/style_property';
import type { StyleField } from '../style_fields_helper';
export declare const FIXED_LABEL: string;
export declare const BY_VALUE_LABEL: string;
export interface Props<StaticOptions, DynamicOptions> {
    children: ReactElement<any>;
    customStaticOptionLabel?: string;
    defaultStaticStyleOptions: StaticOptions;
    defaultDynamicStyleOptions: DynamicOptions;
    disabled?: boolean;
    disabledBy?: VECTOR_STYLES;
    customIcons?: CustomIcon[];
    fields: StyleField[];
    onDynamicStyleChange: (propertyName: VECTOR_STYLES, options: DynamicOptions) => void;
    onStaticStyleChange: (propertyName: VECTOR_STYLES, options: StaticOptions) => void;
    onCustomIconsChange?: (customIcons: CustomIcon[]) => void;
    styleProperty: IStyleProperty<StaticOptions | DynamicOptions>;
}
export declare class StylePropEditor<StaticOptions, DynamicOptions> extends Component<Props<StaticOptions, DynamicOptions>> {
    private _prevStaticStyleOptions;
    private _prevDynamicStyleOptions;
    _onTypeToggle: () => void;
    _onDataMappingChange: (updatedObjects: Partial<DynamicOptions>) => void;
    renderStaticDynamicSelect(): React.JSX.Element;
    render(): React.JSX.Element;
}
