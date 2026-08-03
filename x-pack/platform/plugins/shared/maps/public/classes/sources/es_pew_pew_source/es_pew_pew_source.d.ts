import React from 'react';
import type { Adapters } from '@kbn/inspector-plugin/common/adapters';
import { VECTOR_SHAPE_TYPE } from '../../../../common/constants';
import { AbstractESAggSource } from '../es_agg_source';
import type { SourceEditorArgs } from '../source';
import type { DataFilters, ESPewPewSourceDescriptor, MapExtent, VectorSourceRequestMeta } from '../../../../common/descriptor_types';
import type { BoundsRequestMeta, GeoJsonWithMeta } from '../vector_source';
export declare const sourceTitle: string;
export declare class ESPewPewSource extends AbstractESAggSource {
    readonly _descriptor: ESPewPewSourceDescriptor & Required<Pick<ESPewPewSourceDescriptor, 'metrics'>>;
    static createDescriptor(descriptor: Partial<ESPewPewSourceDescriptor>): ESPewPewSourceDescriptor & Required<Pick<ESPewPewSourceDescriptor, 'metrics'>>;
    constructor(descriptor: ESPewPewSourceDescriptor);
    getBucketsName(): string;
    renderSourceSettingsEditor({ onChange }: SourceEditorArgs): React.JSX.Element;
    isFilterByMapBounds(): boolean;
    supportsJoins(): boolean;
    getSyncMeta(dataFilters: DataFilters): {
        geogridPrecision: number;
        metrics: string[];
    };
    isGeoGridPrecisionAware(): boolean;
    getSupportedShapeTypes(): Promise<VECTOR_SHAPE_TYPE[]>;
    getImmutableProperties(): Promise<{
        label: string;
        value: string;
    }[]>;
    getGeoGridPrecision(zoom: number): number;
    getGeoJsonWithMeta(layerName: string, requestMeta: VectorSourceRequestMeta, registerCancelCallback: (callback: () => void) => void, isRequestStillActive: () => boolean, inspectorAdapters: Adapters): Promise<GeoJsonWithMeta>;
    getGeoFieldName(): string;
    getBoundsForFilters(boundsFilters: BoundsRequestMeta, registerCancelCallback: (callback: () => void) => void): Promise<MapExtent | null>;
    hasTooltipProperties(): boolean;
}
