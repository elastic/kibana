import type { AggregationsExtendedStatsAggregation, AggregationsPercentilesAggregation, AggregationsTermsAggregation } from '@elastic/elasticsearch/lib/api/types';
import type { TileMetaFeature } from '../../../common/descriptor_types';
import { FIELD_ORIGIN } from '../../../common/constants';
import type { IVectorSource } from '../sources/vector_source';
import type { ITooltipProperty } from '../tooltips/tooltip_property';
export interface IField {
    getName(): string;
    getMbFieldName(): string;
    getRootName(): string;
    canValueBeFormatted(): boolean;
    getLabel(): Promise<string>;
    getDataType(): Promise<string>;
    createTooltipProperty(value: string | string[] | undefined): Promise<ITooltipProperty>;
    getSource(): IVectorSource;
    getOrigin(): FIELD_ORIGIN;
    isValid(): boolean;
    getExtendedStatsFieldMetaRequest(): Promise<Record<string, {
        extended_stats: AggregationsExtendedStatsAggregation;
    }> | null>;
    getPercentilesFieldMetaRequest(percentiles: number[]): Promise<Record<string, {
        percentiles: AggregationsPercentilesAggregation;
    }> | null>;
    getCategoricalFieldMetaRequest(size: number): Promise<Record<string, {
        terms: AggregationsTermsAggregation;
    }> | null>;
    supportsFieldMetaFromLocalData(): boolean;
    supportsFieldMetaFromEs(): boolean;
    isEqual(field: IField): boolean;
    pluckRangeFromTileMetaFeature(metaFeature: TileMetaFeature): {
        min: number;
        max: number;
    } | null;
    isCount(): boolean;
}
export declare class AbstractField implements IField {
    private readonly _fieldName;
    private readonly _origin;
    constructor({ fieldName, origin }: {
        fieldName: string;
        origin: FIELD_ORIGIN;
    });
    supportsFieldMetaFromEs(): boolean;
    supportsFieldMetaFromLocalData(): boolean;
    getName(): string;
    getMbFieldName(): string;
    getRootName(): string;
    canValueBeFormatted(): boolean;
    getSource(): IVectorSource;
    isValid(): boolean;
    getDataType(): Promise<string>;
    getLabel(): Promise<string>;
    createTooltipProperty(value: string | string[] | undefined): Promise<ITooltipProperty>;
    getOrigin(): FIELD_ORIGIN;
    getExtendedStatsFieldMetaRequest(): Promise<Record<string, {
        extended_stats: AggregationsExtendedStatsAggregation;
    }> | null>;
    getPercentilesFieldMetaRequest(percentiles: number[]): Promise<Record<string, {
        percentiles: AggregationsPercentilesAggregation;
    }> | null>;
    getCategoricalFieldMetaRequest(size: number): Promise<Record<string, {
        terms: AggregationsTermsAggregation;
    }> | null>;
    isEqual(field: IField): boolean;
    pluckRangeFromTileMetaFeature(metaFeature: TileMetaFeature): null;
    isCount(): boolean;
}
