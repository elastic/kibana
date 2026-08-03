import type { FeatureCollection, GeoJsonProperties } from 'geojson';
import type { SearchResponseWarning } from '@kbn/search-response-warnings';
import type { KibanaExecutionContext } from '@kbn/core/public';
import type { Query } from '@kbn/data-plugin/common/query';
import type { Adapters } from '@kbn/inspector-plugin/common/adapters';
import type { IField } from '../../fields/field';
import type { DataFilters, VectorSourceRequestMeta } from '../../../../common/descriptor_types';
import type { PropertiesMap } from '../../../../common/elasticsearch_util';
import type { ITooltipProperty } from '../../tooltips/tooltip_property';
import type { ISource } from '../source';
export interface IJoinSource extends ISource {
    hasCompleteConfig(): boolean;
    getWhereQuery(): Query | undefined;
    getJoinMetrics(requestMeta: VectorSourceRequestMeta, layerName: string, registerCancelCallback: (callback: () => void) => void, inspectorAdapters: Adapters, featureCollection?: FeatureCollection): Promise<{
        joinMetrics: PropertiesMap;
        warnings: SearchResponseWarning[];
    }>;
    getSyncMeta(dataFilters: DataFilters): object | null;
    getId(): string;
    getRightFields(): IField[];
    getTooltipProperties(properties: GeoJsonProperties, executionContext: KibanaExecutionContext): Promise<ITooltipProperty[]>;
    getFieldByName(fieldName: string): IField | null;
}
export interface ITermJoinSource extends IJoinSource {
    getTermField(): IField;
}
export declare function isTermJoinSource(joinSource: IJoinSource): boolean;
