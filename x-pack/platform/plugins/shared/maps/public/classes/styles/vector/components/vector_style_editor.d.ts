import React, { Component } from 'react';
import type { EuiSwitchEvent } from '@elastic/eui';
import { VECTOR_SHAPE_TYPE, VECTOR_STYLES } from '../../../../../common/constants';
import type { StyleField, StyleFieldsHelper } from '../style_fields_helper';
import type { CustomIcon, DynamicStylePropertyOptions, StaticStylePropertyOptions, StylePropertyOptions, VectorStylePropertiesDescriptor } from '../../../../../common/descriptor_types';
import type { IStyleProperty } from '../properties/style_property';
import type { IVectorLayer } from '../../../layers/vector_layer';
export interface StyleProperties {
    [key: string]: IStyleProperty<StylePropertyOptions>;
}
interface Props {
    layer: IVectorLayer;
    isPointsOnly: boolean;
    isLinesOnly: boolean;
    onIsTimeAwareChange: (isTimeAware: boolean) => void;
    onCustomIconsChange: (customIcons: CustomIcon[]) => void;
    handlePropertyChange: (propertyName: VECTOR_STYLES, stylePropertyDescriptor: unknown) => void;
    hasBorder: boolean;
    styleProperties: StyleProperties;
    isTimeAware: boolean;
    showIsTimeAware: boolean;
    customIcons: CustomIcon[];
}
interface State {
    styleFields: StyleField[];
    defaultDynamicProperties: Required<VectorStylePropertiesDescriptor>;
    defaultStaticProperties: Required<VectorStylePropertiesDescriptor>;
    supportedFeatures: VECTOR_SHAPE_TYPE[];
    selectedFeature: VECTOR_SHAPE_TYPE;
    styleFieldsHelper?: StyleFieldsHelper;
}
export declare class VectorStyleEditor extends Component<Props, State> {
    private _isMounted;
    constructor(props: Props);
    componentWillUnmount(): void;
    componentDidMount(): void;
    componentDidUpdate(): void;
    _loadFields(): Promise<void>;
    _loadSupportedFeatures(): Promise<void>;
    _handleSelectedFeatureChange: (selectedFeature: string) => void;
    _onIsTimeAwareChange: (event: EuiSwitchEvent) => void;
    _onStaticStyleChange: (propertyName: VECTOR_STYLES, options: StaticStylePropertyOptions) => void;
    _onDynamicStyleChange: (propertyName: VECTOR_STYLES, options: DynamicStylePropertyOptions) => void;
    _hasMarkerOrIcon(): boolean;
    _hasLabelBorder(): boolean;
    _isLayerSourceMvt(): boolean;
    _renderFillColor(isPointFillColor?: boolean): React.JSX.Element;
    _renderLineColor(isPointBorderColor?: boolean): React.JSX.Element;
    _renderLineWidth(isPointBorderWidth?: boolean): React.JSX.Element;
    _renderLabelProperties(isPoint: boolean): React.JSX.Element;
    _renderPointProperties(): React.JSX.Element;
    _renderLineProperties(): React.JSX.Element;
    _renderPolygonProperties(): React.JSX.Element;
    _renderProperties(): React.JSX.Element | null;
    _renderIsTimeAwareSwitch(): React.JSX.Element | null;
    render(): React.JSX.Element;
}
export {};
