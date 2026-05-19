import type { FeatureCollection } from 'geojson';
import type { BoundsRequestMeta, GeoJsonWithMeta } from '../vector_source';
import { AbstractVectorSource } from '../vector_source';
import { SOURCE_TYPES } from '../../../../common/constants';
import type { MapExtent } from '../../../../common/descriptor_types';
import type { IField } from '../../fields/field';
interface InlineFieldDescriptor {
    name: string;
    label?: string;
    type: 'string' | 'number';
}
interface GeojsonFileSourceDescriptor {
    __fields?: InlineFieldDescriptor[];
    __featureCollection: FeatureCollection;
    areResultsTrimmed: boolean;
    tooltipContent: string | null;
    name: string;
    type: SOURCE_TYPES.GEOJSON_FILE;
}
export declare class GeoJsonFileSource extends AbstractVectorSource {
    static createDescriptor(descriptor: Partial<GeojsonFileSourceDescriptor>): GeojsonFileSourceDescriptor;
    constructor(descriptor: Partial<GeojsonFileSourceDescriptor>);
    private _getFieldDescriptors;
    private _createField;
    getFields(): Promise<IField[]>;
    getFieldByName(fieldName: string): IField | null;
    isBoundsAware(): boolean;
    getBoundsForFilters(boundsFilters: BoundsRequestMeta, registerCancelCallback: (callback: () => void) => void): Promise<MapExtent | null>;
    getGeoJsonWithMeta(): Promise<GeoJsonWithMeta>;
    getDisplayName(): Promise<string>;
    hasTooltipProperties(): boolean;
    getSourceStatus(): {
        tooltipContent: string | null;
        areResultsTrimmed: boolean;
    };
    getFeatureCollection(): FeatureCollection<import("geojson").Geometry, import("geojson").GeoJsonProperties>;
}
export {};
