import React from 'react';
import type { GeoJsonProperties, Geometry, Position } from 'geojson';
import type { ImmutableSourceProperty, SourceEditorArgs } from '../source';
import { AbstractSource } from '../source';
import type { BoundsRequestMeta, GetFeatureActionsArgs, GeoJsonWithMeta, IMvtVectorSource } from '../vector_source';
import { VECTOR_SHAPE_TYPE } from '../../../../common/constants';
import type { MapExtent, TiledSingleLayerVectorSourceDescriptor, TooltipFeatureAction } from '../../../../common/descriptor_types';
import { MVTField } from '../../fields/mvt_field';
import type { ITooltipProperty } from '../../tooltips/tooltip_property';
export declare const sourceTitle: string;
export declare class MVTSingleLayerVectorSource extends AbstractSource implements IMvtVectorSource {
    static createDescriptor({ urlTemplate, layerName, minSourceZoom, maxSourceZoom, fields, tooltipProperties, }: Partial<TiledSingleLayerVectorSourceDescriptor>): Required<TiledSingleLayerVectorSourceDescriptor>;
    readonly _descriptor: Required<TiledSingleLayerVectorSourceDescriptor>;
    readonly _tooltipFields: MVTField[];
    constructor(sourceDescriptor: TiledSingleLayerVectorSourceDescriptor);
    isMvt(): boolean;
    supportsFitToBounds(): Promise<boolean>;
    renderSourceSettingsEditor({ onChange }: SourceEditorArgs): React.JSX.Element;
    addFeature(geometry: Geometry | Position[]): Promise<void>;
    deleteFeature(featureId: string): Promise<void>;
    getMVTFields(): MVTField[];
    getFieldByName(fieldName: string): MVTField | null;
    getGeoJsonWithMeta(): Promise<GeoJsonWithMeta>;
    getFields(): Promise<MVTField[]>;
    getTileSourceLayer(): string;
    getImmutableProperties(): Promise<ImmutableSourceProperty[]>;
    getDisplayName(): Promise<string>;
    getTileUrl(): Promise<string>;
    getSupportedShapeTypes(): Promise<VECTOR_SHAPE_TYPE[]>;
    hasTooltipProperties(): boolean;
    getMinZoom(): number;
    getMaxZoom(): number;
    getBoundsForFilters(boundsFilters: BoundsRequestMeta, registerCancelCallback: (callback: () => void) => void): Promise<MapExtent | null>;
    getSyncMeta(): {
        mvtFields: string[];
    };
    isBoundsAware(): boolean;
    getSourceStatus(): {
        tooltipContent: null;
        areResultsTrimmed: boolean;
    };
    getLeftJoinFields(): Promise<never[]>;
    getTooltipProperties(properties: GeoJsonProperties): Promise<ITooltipProperty[]>;
    getTimesliceMaskFieldName(): Promise<null>;
    supportsFeatureEditing(): Promise<boolean>;
    supportsJoins(): boolean;
    getFeatureActions(args: GetFeatureActionsArgs): TooltipFeatureAction[];
    getInspectorRequestIds(): string[];
}
