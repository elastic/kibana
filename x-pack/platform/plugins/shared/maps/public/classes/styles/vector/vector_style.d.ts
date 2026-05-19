import type { ReactElement } from 'react';
import React from 'react';
import type { Map as MbMap } from '@kbn/mapbox-gl';
import type { FeatureCollection } from 'geojson';
import type { Writable } from '@kbn/utility-types';
import { FIELD_ORIGIN, ICON_SOURCE, LAYER_STYLE_TYPE, STYLE_TYPE, VECTOR_STYLES } from '../../../../common/constants';
import { StyleMeta } from './style_meta';
import type { IDynamicStyleProperty } from './properties/dynamic_style_property';
import { DynamicSizeProperty } from './properties/dynamic_size_property';
import { StaticSizeProperty } from './properties/static_size_property';
import { StaticColorProperty } from './properties/static_color_property';
import { DynamicColorProperty } from './properties/dynamic_color_property';
import { StaticOrientationProperty } from './properties/static_orientation_property';
import { DynamicOrientationProperty } from './properties/dynamic_orientation_property';
import { StaticTextProperty } from './properties/static_text_property';
import { DynamicTextProperty } from './properties/dynamic_text_property';
import { StaticIconProperty } from './properties/static_icon_property';
import { DynamicIconProperty } from './properties/dynamic_icon_property';
import type { ColorStylePropertyDescriptor, CustomIcon, DynamicStylePropertyOptions, IconStylePropertyDescriptor, LabelStylePropertyDescriptor, OrientationStylePropertyDescriptor, SizeStylePropertyDescriptor, StyleDescriptor, StylePropertyField, StylePropertyOptions, VectorStyleDescriptor, VectorStylePropertiesDescriptor } from '../../../../common/descriptor_types';
import type { IStyle } from '../style';
import type { IStyleProperty } from './properties/style_property';
import type { IField } from '../../fields/field';
import type { IVectorLayer } from '../../layers/vector_layer';
import type { IVectorSource } from '../../sources/vector_source';
import type { StyleFieldsHelper } from './style_fields_helper';
export interface IVectorStyle extends IStyle {
    getAllStyleProperties(): Array<IStyleProperty<StylePropertyOptions>>;
    getDynamicPropertiesArray(): Array<IDynamicStyleProperty<DynamicStylePropertyOptions>>;
    getSourceFieldNames(): string[];
    getStyleMeta(): StyleMeta;
    getDescriptorWithUpdatedStyleProps(nextFields: IField[], mapColors: string[], previousFields?: IField[]): Promise<{
        hasChanges: boolean;
        nextStyleDescriptor?: VectorStyleDescriptor;
    }>;
    getIsPointsOnly(): boolean;
    isTimeAware(): boolean;
    getPropertiesDescriptor(): VectorStylePropertiesDescriptor;
    getPrimaryColor(): string;
    getIcon(showIncompleteIndicator: boolean): ReactElement;
    getIconSvg(symbolId: string): string | undefined;
    isUsingCustomIcon(symbolId: string): boolean;
    hasLegendDetails: () => Promise<boolean>;
    renderLegendDetails: () => ReactElement | null;
    clearFeatureState: (featureCollection: FeatureCollection, mbMap: MbMap, sourceId: string) => void;
    setFeatureStateAndStyleProps: (featureCollection: FeatureCollection, mbMap: MbMap, mbSourceId: string) => boolean;
    hasLabels: () => boolean;
    arePointsSymbolizedAsCircles: () => boolean;
    setMBPaintProperties: ({ alpha, mbMap, fillLayerId, lineLayerId, }: {
        alpha: unknown;
        mbMap: MbMap;
        fillLayerId: string;
        lineLayerId: string;
    }) => void;
    setMBPaintPropertiesForPoints: ({ alpha, mbMap, pointLayerId, }: {
        alpha: unknown;
        mbMap: MbMap;
        pointLayerId: string;
    }) => void;
    setMBPropertiesForLabelText: ({ alpha, mbMap, textLayerId, }: {
        alpha: unknown;
        mbMap: MbMap;
        textLayerId: string;
    }) => void;
    setMBSymbolPropertiesForPoints: ({ mbMap, symbolLayerId, alpha, }: {
        alpha: unknown;
        mbMap: MbMap;
        symbolLayerId: string;
    }) => void;
}
type NormalizedVectorStyleDescriptor = VectorStyleDescriptor & {
    properties: Writable<Required<VectorStyleDescriptor['properties']>>;
};
export declare class VectorStyle implements IVectorStyle {
    private readonly _descriptor;
    private readonly _layer;
    private readonly _customIcons;
    private readonly _source;
    private readonly _styleMeta;
    private readonly _symbolizeAs;
    private readonly _lineColor;
    private readonly _fillColor;
    private readonly _lineWidth;
    private readonly _icon;
    private readonly _iconSize;
    private readonly _iconOrientation;
    private readonly _label;
    private readonly _labelZoomRange;
    private readonly _labelSize;
    private readonly _labelColor;
    private readonly _labelBorderColor;
    private readonly _labelBorderSize;
    private readonly _labelPosition;
    static createDescriptor(properties?: Partial<VectorStylePropertiesDescriptor>, isTimeAware?: boolean): NormalizedVectorStyleDescriptor;
    static createDefaultStyleProperties(mapColors: string[]): Required<Writable<Readonly<{
        symbolizeAs?: Readonly<{} & {
            options: Readonly<{
                value?: import("../../../../common/constants").SYMBOLIZE_AS_TYPES | undefined;
            } & {}>;
        }> | undefined;
        fillColor?: Readonly<{} & {
            type: STYLE_TYPE.STATIC;
            options: Readonly<{} & {
                color: string;
            }>;
        }> | Readonly<{} & {
            type: STYLE_TYPE.DYNAMIC;
            options: Readonly<{
                type?: import("../../../../common/constants").COLOR_MAP_TYPE | undefined;
                field?: Readonly<{} & {
                    name: string;
                    origin: FIELD_ORIGIN;
                }> | undefined;
                color?: string | undefined;
                invert?: boolean | undefined;
                customColorRamp?: Readonly<{} & {
                    stop: number;
                    color: string;
                }>[] | undefined;
                useCustomColorRamp?: boolean | undefined;
                dataMappingFunction?: import("../../../../common/constants").DATA_MAPPING_FUNCTION | undefined;
                colorCategory?: string | undefined;
                customColorPalette?: Readonly<{} & {
                    stop: string | null;
                    color: string;
                }>[] | undefined;
                useCustomColorPalette?: boolean | undefined;
                otherCategoryColor?: string | undefined;
            } & {
                fieldMetaOptions: Readonly<{
                    percentiles?: number[] | undefined;
                    sigma?: number | undefined;
                } & {
                    isEnabled: boolean;
                }>;
            }>;
        }> | undefined;
        lineColor?: Readonly<{} & {
            type: STYLE_TYPE.STATIC;
            options: Readonly<{} & {
                color: string;
            }>;
        }> | Readonly<{} & {
            type: STYLE_TYPE.DYNAMIC;
            options: Readonly<{
                type?: import("../../../../common/constants").COLOR_MAP_TYPE | undefined;
                field?: Readonly<{} & {
                    name: string;
                    origin: FIELD_ORIGIN;
                }> | undefined;
                color?: string | undefined;
                invert?: boolean | undefined;
                customColorRamp?: Readonly<{} & {
                    stop: number;
                    color: string;
                }>[] | undefined;
                useCustomColorRamp?: boolean | undefined;
                dataMappingFunction?: import("../../../../common/constants").DATA_MAPPING_FUNCTION | undefined;
                colorCategory?: string | undefined;
                customColorPalette?: Readonly<{} & {
                    stop: string | null;
                    color: string;
                }>[] | undefined;
                useCustomColorPalette?: boolean | undefined;
                otherCategoryColor?: string | undefined;
            } & {
                fieldMetaOptions: Readonly<{
                    percentiles?: number[] | undefined;
                    sigma?: number | undefined;
                } & {
                    isEnabled: boolean;
                }>;
            }>;
        }> | undefined;
        lineWidth?: Readonly<{} & {
            type: STYLE_TYPE.STATIC;
            options: Readonly<{} & {
                size: number;
            }>;
        }> | Readonly<{} & {
            type: STYLE_TYPE.DYNAMIC;
            options: Readonly<{
                field?: Readonly<{} & {
                    name: string;
                    origin: FIELD_ORIGIN;
                }> | undefined;
                invert?: boolean | undefined;
            } & {
                maxSize: number;
                minSize: number;
                fieldMetaOptions: Readonly<{
                    percentiles?: number[] | undefined;
                    sigma?: number | undefined;
                } & {
                    isEnabled: boolean;
                }>;
            }>;
        }> | undefined;
        icon?: Readonly<{} & {
            type: STYLE_TYPE.STATIC;
            options: Readonly<{
                label?: string | undefined;
                svg?: string | undefined;
                iconSource?: ICON_SOURCE | undefined;
            } & {
                value: string;
            }>;
        }> | Readonly<{} & {
            type: STYLE_TYPE.DYNAMIC;
            options: Readonly<{
                field?: Readonly<{} & {
                    name: string;
                    origin: FIELD_ORIGIN;
                }> | undefined;
                customIconStops?: Readonly<{
                    iconSource?: ICON_SOURCE | undefined;
                } & {
                    stop: string | null;
                    icon: string;
                }>[] | undefined;
                useCustomIconMap?: boolean | undefined;
            } & {
                fieldMetaOptions: Readonly<{
                    percentiles?: number[] | undefined;
                    sigma?: number | undefined;
                } & {
                    isEnabled: boolean;
                }>;
                iconPaletteId: string | null;
            }>;
        }> | undefined;
        iconSize?: Readonly<{} & {
            type: STYLE_TYPE.STATIC;
            options: Readonly<{} & {
                size: number;
            }>;
        }> | Readonly<{} & {
            type: STYLE_TYPE.DYNAMIC;
            options: Readonly<{
                field?: Readonly<{} & {
                    name: string;
                    origin: FIELD_ORIGIN;
                }> | undefined;
                invert?: boolean | undefined;
            } & {
                maxSize: number;
                minSize: number;
                fieldMetaOptions: Readonly<{
                    percentiles?: number[] | undefined;
                    sigma?: number | undefined;
                } & {
                    isEnabled: boolean;
                }>;
            }>;
        }> | undefined;
        iconOrientation?: Readonly<{} & {
            type: STYLE_TYPE.STATIC;
            options: Readonly<{} & {
                orientation: number;
            }>;
        }> | Readonly<{} & {
            type: STYLE_TYPE.DYNAMIC;
            options: Readonly<{
                field?: Readonly<{} & {
                    name: string;
                    origin: FIELD_ORIGIN;
                }> | undefined;
            } & {
                fieldMetaOptions: Readonly<{
                    percentiles?: number[] | undefined;
                    sigma?: number | undefined;
                } & {
                    isEnabled: boolean;
                }>;
            }>;
        }> | undefined;
        labelText?: Readonly<{} & {
            type: STYLE_TYPE.STATIC;
            options: Readonly<{} & {
                value: string;
            }>;
        }> | Readonly<{} & {
            type: STYLE_TYPE.DYNAMIC;
            options: Readonly<{
                field?: Readonly<{} & {
                    name: string;
                    origin: FIELD_ORIGIN;
                }> | undefined;
            } & {}>;
        }> | undefined;
        labelZoomRange?: Readonly<{} & {
            options: Readonly<{} & {
                minZoom: number;
                maxZoom: number;
                useLayerZoomRange: boolean;
            }>;
        }> | undefined;
        labelColor?: Readonly<{} & {
            type: STYLE_TYPE.STATIC;
            options: Readonly<{} & {
                color: string;
            }>;
        }> | Readonly<{} & {
            type: STYLE_TYPE.DYNAMIC;
            options: Readonly<{
                type?: import("../../../../common/constants").COLOR_MAP_TYPE | undefined;
                field?: Readonly<{} & {
                    name: string;
                    origin: FIELD_ORIGIN;
                }> | undefined;
                color?: string | undefined;
                invert?: boolean | undefined;
                customColorRamp?: Readonly<{} & {
                    stop: number;
                    color: string;
                }>[] | undefined;
                useCustomColorRamp?: boolean | undefined;
                dataMappingFunction?: import("../../../../common/constants").DATA_MAPPING_FUNCTION | undefined;
                colorCategory?: string | undefined;
                customColorPalette?: Readonly<{} & {
                    stop: string | null;
                    color: string;
                }>[] | undefined;
                useCustomColorPalette?: boolean | undefined;
                otherCategoryColor?: string | undefined;
            } & {
                fieldMetaOptions: Readonly<{
                    percentiles?: number[] | undefined;
                    sigma?: number | undefined;
                } & {
                    isEnabled: boolean;
                }>;
            }>;
        }> | undefined;
        labelSize?: Readonly<{} & {
            type: STYLE_TYPE.STATIC;
            options: Readonly<{} & {
                size: number;
            }>;
        }> | Readonly<{} & {
            type: STYLE_TYPE.DYNAMIC;
            options: Readonly<{
                field?: Readonly<{} & {
                    name: string;
                    origin: FIELD_ORIGIN;
                }> | undefined;
                invert?: boolean | undefined;
            } & {
                maxSize: number;
                minSize: number;
                fieldMetaOptions: Readonly<{
                    percentiles?: number[] | undefined;
                    sigma?: number | undefined;
                } & {
                    isEnabled: boolean;
                }>;
            }>;
        }> | undefined;
        labelBorderColor?: Readonly<{} & {
            type: STYLE_TYPE.STATIC;
            options: Readonly<{} & {
                color: string;
            }>;
        }> | Readonly<{} & {
            type: STYLE_TYPE.DYNAMIC;
            options: Readonly<{
                type?: import("../../../../common/constants").COLOR_MAP_TYPE | undefined;
                field?: Readonly<{} & {
                    name: string;
                    origin: FIELD_ORIGIN;
                }> | undefined;
                color?: string | undefined;
                invert?: boolean | undefined;
                customColorRamp?: Readonly<{} & {
                    stop: number;
                    color: string;
                }>[] | undefined;
                useCustomColorRamp?: boolean | undefined;
                dataMappingFunction?: import("../../../../common/constants").DATA_MAPPING_FUNCTION | undefined;
                colorCategory?: string | undefined;
                customColorPalette?: Readonly<{} & {
                    stop: string | null;
                    color: string;
                }>[] | undefined;
                useCustomColorPalette?: boolean | undefined;
                otherCategoryColor?: string | undefined;
            } & {
                fieldMetaOptions: Readonly<{
                    percentiles?: number[] | undefined;
                    sigma?: number | undefined;
                } & {
                    isEnabled: boolean;
                }>;
            }>;
        }> | undefined;
        labelBorderSize?: Readonly<{} & {
            options: Readonly<{} & {
                size: import("../../../../common/constants").LABEL_BORDER_SIZES;
            }>;
        }> | undefined;
        labelPosition?: Readonly<{} & {
            options: Readonly<{} & {
                position: import("../../../../common/constants").LABEL_POSITIONS;
            }>;
        }> | undefined;
    } & {}>>>;
    constructor(descriptor: VectorStyleDescriptor | null, source: IVectorSource, layer: IVectorLayer, customIcons: CustomIcon[], chartsPaletteServiceGetColor?: (value: string) => string | null);
    _updateFieldsInDescriptor(nextFields: IField[], styleFieldsHelper: StyleFieldsHelper, previousFields: IField[], mapColors: string[]): Promise<{
        hasChanges: boolean;
        nextStyleDescriptor: NormalizedVectorStyleDescriptor;
    }>;
    _deleteFieldsFromDescriptorAndUpdateStyling(originalProperties: VectorStylePropertiesDescriptor, hasChanges: boolean, styleFieldsHelper: StyleFieldsHelper, mapColors: string[]): Promise<{
        hasChanges: boolean;
        nextStyleDescriptor: NormalizedVectorStyleDescriptor;
    }>;
    getDescriptorWithUpdatedStyleProps(nextFields: IField[], mapColors: string[], previousFields?: IField[]): Promise<{
        hasChanges: boolean;
        nextStyleDescriptor: NormalizedVectorStyleDescriptor;
    }>;
    getType(): LAYER_STYLE_TYPE;
    getAllStyleProperties(): Array<IStyleProperty<StylePropertyOptions>>;
    _hasBorder(): boolean;
    renderEditor(onStyleDescriptorChange: (styleDescriptor: StyleDescriptor) => void, onCustomIconsChange: (customIcons: CustomIcon[]) => void): React.JSX.Element;
    getSourceFieldNames(): string[];
    isTimeAware(): boolean;
    getPropertiesDescriptor(): NormalizedVectorStyleDescriptor['properties'];
    getDynamicPropertiesArray(): Array<IDynamicStyleProperty<DynamicStylePropertyOptions>>;
    getIsPointsOnly: () => boolean;
    _getIsLinesOnly: () => boolean;
    _getIsPolygonsOnly: () => boolean;
    _getDynamicPropertyByFieldName(fieldName: string): IDynamicStyleProperty<DynamicStylePropertyOptions> | undefined;
    getStyleMeta(): StyleMeta;
    _getFieldFormatter: (fieldName: string) => any;
    getIconSvg(symbolId: string): string | undefined;
    _getSymbolId(): string | undefined;
    _getIconMeta(symbolId: string): {
        svg: string;
        label: string;
        iconSource: ICON_SOURCE;
    } | undefined;
    getPrimaryColor(): string;
    getIcon(showIncompleteIndicator: boolean): React.JSX.Element;
    isUsingCustomIcon(symbolId: string): boolean;
    _getLegendDetailStyleProperties: () => IDynamicStyleProperty<DynamicStylePropertyOptions>[];
    hasLegendDetails(): Promise<boolean>;
    renderLegendDetails(): ReactElement | null;
    clearFeatureState(featureCollection: FeatureCollection, mbMap: MbMap, sourceId: string): void;
    setFeatureStateAndStyleProps(featureCollection: FeatureCollection, mbMap: MbMap, mbSourceId: string): boolean;
    arePointsSymbolizedAsCircles(): boolean;
    hasLabels(): boolean;
    setMBPaintProperties({ alpha, mbMap, fillLayerId, lineLayerId, }: {
        alpha: unknown;
        mbMap: MbMap;
        fillLayerId: string;
        lineLayerId: string;
    }): void;
    setMBPaintPropertiesForPoints({ alpha, mbMap, pointLayerId, }: {
        alpha: unknown;
        mbMap: MbMap;
        pointLayerId: string;
    }): void;
    setMBPropertiesForLabelText({ alpha, mbMap, textLayerId, }: {
        alpha: unknown;
        mbMap: MbMap;
        textLayerId: string;
    }): void;
    setMBSymbolPropertiesForPoints({ mbMap, symbolLayerId, alpha, }: {
        alpha: unknown;
        mbMap: MbMap;
        symbolLayerId: string;
    }): void;
    _makeField(fieldDescriptor?: StylePropertyField): IField | null;
    _makeSizeProperty(descriptor: SizeStylePropertyDescriptor | undefined, styleName: VECTOR_STYLES, isSymbolizedAsIcon: boolean): StaticSizeProperty | DynamicSizeProperty;
    _makeColorProperty(descriptor: ColorStylePropertyDescriptor | undefined, styleName: VECTOR_STYLES, chartsPaletteServiceGetColor?: (value: string) => string | null): StaticColorProperty | DynamicColorProperty;
    _makeOrientationProperty(descriptor: OrientationStylePropertyDescriptor | undefined, styleName: VECTOR_STYLES): StaticOrientationProperty | DynamicOrientationProperty;
    _makeLabelProperty(descriptor?: LabelStylePropertyDescriptor): StaticTextProperty | DynamicTextProperty;
    _makeIconProperty(descriptor?: IconStylePropertyDescriptor): StaticIconProperty | DynamicIconProperty;
}
export {};
