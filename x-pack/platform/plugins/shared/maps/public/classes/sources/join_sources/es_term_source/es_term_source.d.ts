import type { Query } from '@kbn/es-query';
import type { Adapters } from '@kbn/inspector-plugin/common/adapters';
import { AGG_TYPE, FIELD_ORIGIN, SOURCE_TYPES } from '../../../../../common/constants';
import { ESDocField } from '../../../fields/es_doc_field';
import { AbstractESAggSource } from '../../es_agg_source';
import type { DataFilters, ESTermSourceDescriptor, VectorSourceRequestMeta } from '../../../../../common/descriptor_types';
import type { PropertiesMap } from '../../../../../common/elasticsearch_util';
import type { ITermJoinSource } from '../types';
import type { IESAggSource, ESAggsSourceSyncMeta } from '../../es_agg_source';
import type { IField } from '../../../fields/field';
type ESTermSourceSyncMeta = ESAggsSourceSyncMeta & Pick<ESTermSourceDescriptor, 'indexPatternId' | 'size' | 'term'>;
export declare function extractPropertiesMap(rawEsData: any, countPropertyName: string): PropertiesMap;
export declare class ESTermSource extends AbstractESAggSource implements ITermJoinSource, IESAggSource {
    static type: SOURCE_TYPES;
    static createDescriptor(descriptor: Partial<ESTermSourceDescriptor>): ESTermSourceDescriptor & Required<Pick<ESTermSourceDescriptor, 'metrics'>>;
    private readonly _termField;
    readonly _descriptor: ESTermSourceDescriptor & Required<Pick<ESTermSourceDescriptor, 'metrics'>>;
    constructor(descriptor: Partial<ESTermSourceDescriptor>);
    hasCompleteConfig(): boolean;
    getTermField(): ESDocField;
    getOriginForField(): FIELD_ORIGIN;
    getWhereQuery(): Query | undefined;
    getAggKey(aggType: AGG_TYPE, fieldName?: string): string;
    getAggLabel(aggType: AGG_TYPE, fieldLabel: string): Promise<string>;
    getJoinMetrics(requestMeta: VectorSourceRequestMeta, layerName: string, registerCancelCallback: (callback: () => void) => void, inspectorAdapters: Adapters): Promise<{
        joinMetrics: PropertiesMap;
        warnings: import("@kbn/search-response-warnings/src/types").SearchResponseIncompleteWarning[];
    }>;
    isFilterByMapBounds(): boolean;
    getDisplayName(): Promise<string>;
    getSyncMeta(dataFilters: DataFilters): ESTermSourceSyncMeta;
    getRightFields(): IField[];
}
export {};
