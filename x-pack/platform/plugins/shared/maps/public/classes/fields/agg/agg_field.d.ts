import type { DataView } from '@kbn/data-plugin/common';
import type { AggregationsExtendedStatsAggregation, AggregationsPercentilesAggregation, AggregationsTermsAggregation } from '@elastic/elasticsearch/lib/api/types';
import { AGG_TYPE } from '../../../../common/constants';
import type { TileMetaFeature } from '../../../../common/descriptor_types';
import { CountAggField } from './count_agg_field';
import type { CountAggFieldParams } from './agg_field_types';
import type { IField } from '../field';
export interface AggFieldParams extends CountAggFieldParams {
    esDocField?: IField;
    aggType: AGG_TYPE;
}
export declare class AggField extends CountAggField {
    private readonly _esDocField?;
    private readonly _aggType;
    constructor(params: AggFieldParams);
    supportsFieldMetaFromEs(): boolean;
    supportsFieldMetaFromLocalData(): boolean;
    isValid(): boolean;
    getMbFieldName(): string;
    canValueBeFormatted(): boolean;
    isCount(): boolean;
    _getAggType(): AGG_TYPE;
    getValueAggDsl(indexPattern: DataView): unknown;
    getRootName(): string;
    getLabel(): Promise<string>;
    _getDataTypeSynchronous(): string;
    getDataType(): Promise<string>;
    getBucketCount(): number;
    getExtendedStatsFieldMetaRequest(): Promise<Record<string, {
        extended_stats: AggregationsExtendedStatsAggregation;
    }> | null>;
    getPercentilesFieldMetaRequest(percentiles: number[]): Promise<Record<string, {
        percentiles: AggregationsPercentilesAggregation;
    }> | null>;
    getCategoricalFieldMetaRequest(size: number): Promise<Record<string, {
        terms: AggregationsTermsAggregation;
    }> | null>;
    pluckRangeFromTileMetaFeature(metaFeature: TileMetaFeature): {
        min: number;
        max: number;
    } | null;
}
