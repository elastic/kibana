import type { AggregationsExtendedStatsAggregation, AggregationsPercentilesAggregation, AggregationsTermsAggregation } from '@elastic/elasticsearch/lib/api/types';
import type { DataView } from '@kbn/data-plugin/common';
import type { IESAggSource } from '../../sources/es_agg_source';
import type { IVectorSource } from '../../sources/vector_source';
import type { FIELD_ORIGIN } from '../../../../common/constants';
import { AGG_TYPE } from '../../../../common/constants';
import type { AggDescriptor, TileMetaFeature } from '../../../../common/descriptor_types';
import type { ITooltipProperty } from '../../tooltips/tooltip_property';
import type { IESAggField, CountAggFieldParams } from './agg_field_types';
export declare class CountAggField implements IESAggField {
    protected readonly _source: IESAggSource;
    private readonly _origin;
    protected readonly _label?: string;
    protected readonly _mask?: AggDescriptor['mask'];
    constructor({ label, source, origin, mask }: CountAggFieldParams);
    supportsFieldMetaFromEs(): boolean;
    supportsFieldMetaFromLocalData(): boolean;
    _getAggType(): AGG_TYPE;
    getSource(): IVectorSource;
    getOrigin(): FIELD_ORIGIN;
    getName(): string;
    getMbFieldName(): string;
    getRootName(): string;
    getLabel(): Promise<string>;
    isValid(): boolean;
    getDataType(): Promise<string>;
    createTooltipProperty(value: string | string[] | undefined): Promise<ITooltipProperty>;
    getValueAggDsl(indexPattern: DataView): unknown | null;
    getBucketCount(): number;
    isCount(): boolean;
    canValueBeFormatted(): boolean;
    getExtendedStatsFieldMetaRequest(): Promise<Record<string, {
        extended_stats: AggregationsExtendedStatsAggregation;
    }> | null>;
    getPercentilesFieldMetaRequest(percentiles: number[]): Promise<Record<string, {
        percentiles: AggregationsPercentilesAggregation;
    }> | null>;
    getCategoricalFieldMetaRequest(size: number): Promise<Record<string, {
        terms: AggregationsTermsAggregation;
    }> | null>;
    isEqual(field: IESAggField): boolean;
    pluckRangeFromTileMetaFeature(metaFeature: TileMetaFeature): {
        min: number;
        max: number;
    } | null;
    getMask(): Readonly<{} & {
        value: number;
        operator: import("../../../../common/constants").MASK_OPERATOR;
    }> | undefined;
}
