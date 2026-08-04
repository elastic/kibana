import type { GeoJsonProperties } from 'geojson';
import type { Query } from '@kbn/data-plugin/common';
import type { VECTOR_SHAPE_TYPE } from '../../../../../common/constants';
import { SOURCE_TYPES } from '../../../../../common/constants';
import type { MapExtent, VectorSourceRequestMeta } from '../../../../../common/descriptor_types';
import type { ITermJoinSource } from '../types';
import type { PropertiesMap } from '../../../../../common/elasticsearch_util';
import type { IField } from '../../../fields/field';
import type { BoundsRequestMeta, GeoJsonWithMeta, IVectorSource, SourceStatus } from '../../vector_source';
import { AbstractVectorSource } from '../../vector_source';
import type { DataRequest } from '../../../util/data_request';
import type { ITooltipProperty } from '../../../tooltips/tooltip_property';
export interface TableSourceDescriptor {
    id: string;
    type: SOURCE_TYPES.TABLE_SOURCE;
    __rows: Array<{
        [key: string]: string | number;
    }>;
    __columns: Array<{
        name: string;
        label?: string;
        type: 'string' | 'number';
    }>;
    term: string;
}
export declare class TableSource extends AbstractVectorSource implements ITermJoinSource, IVectorSource {
    static type: SOURCE_TYPES;
    static createDescriptor(descriptor: Partial<TableSourceDescriptor>): TableSourceDescriptor;
    readonly _descriptor: TableSourceDescriptor;
    constructor(descriptor: Partial<TableSourceDescriptor>);
    getDisplayName(): Promise<string>;
    getJoinMetrics(requestMeta: VectorSourceRequestMeta, layerName: string, registerCancelCallback: (callback: () => void) => void): Promise<{
        joinMetrics: PropertiesMap;
        warnings: never[];
    }>;
    getTermField(): IField;
    getWhereQuery(): Query | undefined;
    hasCompleteConfig(): boolean;
    getId(): string;
    getRightFields(): IField[];
    hasTooltipProperties(): boolean;
    getBoundsForFilters(boundsFilters: BoundsRequestMeta, registerCancelCallback: (callback: () => void) => void): Promise<MapExtent | null>;
    getFieldByName(fieldName: string): IField | null;
    getFields(): Promise<IField[]>;
    getGeoJsonWithMeta(layerName: string, requestMeta: VectorSourceRequestMeta, registerCancelCallback: (callback: () => void) => void, isRequestStillActive: () => boolean): Promise<GeoJsonWithMeta>;
    getLeftJoinFields(): Promise<IField[]>;
    getSourceStatus(sourceDataRequest?: DataRequest): SourceStatus;
    getSupportedShapeTypes(): Promise<VECTOR_SHAPE_TYPE[]>;
    isBoundsAware(): boolean;
    getTooltipProperties(properties: GeoJsonProperties): Promise<ITooltipProperty[]>;
}
