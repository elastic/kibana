import type { ReactNode } from 'react';
import type { AggregationsExtendedStatsAggregation, AggregationsPercentilesAggregation, AggregationsTermsAggregation } from '@elastic/elasticsearch/lib/api/types';
import type { Filter } from '@kbn/es-query';
import type { IField, IVectorSource } from '@kbn/maps-plugin/public';
import { FIELD_ORIGIN } from '@kbn/maps-plugin/common';
import type { TileMetaFeature } from '@kbn/maps-plugin/common/descriptor_types';
import type { ITooltipProperty } from '@kbn/maps-plugin/public';
import type { AnomalySource } from './anomaly_source';
export declare const ACTUAL_LABEL: string;
export declare const TYPICAL_LABEL: string;
export declare const TYPICAL_TO_ACTUAL: string;
export declare const ANOMALY_SOURCE_FIELDS: Record<string, Record<string, string>>;
export declare class AnomalySourceTooltipProperty implements ITooltipProperty {
    private readonly _field;
    private readonly _value;
    constructor(_field: string, _value: string);
    getESFilters(): Promise<Filter[]>;
    getHtmlDisplayValue(): string | ReactNode;
    getPropertyKey(): string;
    getPropertyName(): string;
    getRawValue(): string | string[] | undefined;
    isFilterable(): boolean;
}
export declare class AnomalySourceField implements IField {
    private readonly _source;
    private readonly _field;
    constructor({ source, field }: {
        source: AnomalySource;
        field: string;
    });
    createTooltipProperty(value: string | string[] | undefined): Promise<ITooltipProperty>;
    getDataType(): Promise<string>;
    getLabel(): Promise<string>;
    getName(): string;
    getMbFieldName(): string;
    getOrigin(): FIELD_ORIGIN;
    getRootName(): string;
    getSource(): IVectorSource;
    isEqual(field: IField): boolean;
    isValid(): boolean;
    supportsFieldMetaFromLocalData(): boolean;
    supportsFieldMetaFromEs(): boolean;
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
    pluckRangeFromTileMetaFeature(metaFeature: TileMetaFeature): {
        min: number;
        max: number;
    } | null;
    isCount(): boolean;
}
