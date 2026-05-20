import type { FeatureCollection } from 'geojson';
import type { Query } from '@kbn/es-query';
import type { Adapters } from '@kbn/inspector-plugin/common/adapters';
import { AGG_TYPE, FIELD_ORIGIN, SOURCE_TYPES } from '../../../../../common/constants';
import { AbstractESAggSource } from '../../es_agg_source';
import type { DataFilters, ESDistanceSourceDescriptor, VectorSourceRequestMeta } from '../../../../../common/descriptor_types';
import type { IJoinSource } from '../types';
import type { IESAggSource, ESAggsSourceSyncMeta } from '../../es_agg_source';
import type { IField } from '../../../fields/field';
export declare const DEFAULT_WITHIN_DISTANCE = 5;
type ESDistanceSourceSyncMeta = ESAggsSourceSyncMeta & Pick<ESDistanceSourceDescriptor, 'distance' | 'geoField'>;
type NormalizedESDistanceSourceDescriptor = ESDistanceSourceDescriptor & Required<Pick<ESDistanceSourceDescriptor, 'distance' | 'metrics'>>;
export declare class ESDistanceSource extends AbstractESAggSource implements IJoinSource, IESAggSource {
    static type: SOURCE_TYPES;
    static createDescriptor(descriptor: Partial<ESDistanceSourceDescriptor>): NormalizedESDistanceSourceDescriptor;
    readonly _descriptor: NormalizedESDistanceSourceDescriptor;
    constructor(descriptor: Partial<ESDistanceSourceDescriptor>);
    getGeoFieldName(): string;
    hasCompleteConfig(): boolean;
    getOriginForField(): FIELD_ORIGIN;
    getWhereQuery(): Query | undefined;
    getAggKey(aggType: AGG_TYPE, fieldName?: string): string;
    getJoinMetrics(requestMeta: VectorSourceRequestMeta, layerName: string, registerCancelCallback: (callback: () => void) => void, inspectorAdapters: Adapters, featureCollection?: FeatureCollection): Promise<{
        joinMetrics: import("../../../../../common/elasticsearch_util").PropertiesMap;
        warnings: import("@kbn/search-response-warnings/src/types").SearchResponseIncompleteWarning[];
    }>;
    isFilterByMapBounds(): boolean;
    getSyncMeta(dataFilters: DataFilters): ESDistanceSourceSyncMeta;
    getRightFields(): IField[];
}
export {};
