import React from 'react';
import type { FeatureCollection } from 'geojson';
import type { Map as MbMap } from '@kbn/mapbox-gl';
import type { DataRequest } from '../../../util/data_request';
import type { IStyleProperty } from './style_property';
import { AbstractStyleProperty } from './style_property';
import type { VECTOR_STYLES, RawValue, FieldFormatter } from '../../../../../common/constants';
import { FIELD_ORIGIN, MB_LOOKUP_FUNCTION, DATA_MAPPING_FUNCTION, STYLE_TYPE } from '../../../../../common/constants';
import type { Category, FieldMetaOptions, PercentilesFieldMeta, RangeFieldMeta, StyleMetaData } from '../../../../../common/descriptor_types';
import type { IField } from '../../../fields/field';
import type { IVectorLayer } from '../../../layers/vector_layer';
export declare const OTHER_CATEGORY_KEY = "__other_bucket__";
export interface IDynamicStyleProperty<T> extends IStyleProperty<T> {
    getFieldMetaOptions(): FieldMetaOptions;
    getField(): IField | null;
    getFieldName(): string;
    getMbFieldName(): string;
    getFieldOrigin(): FIELD_ORIGIN | null;
    getRangeFieldMeta(): RangeFieldMeta | null;
    getCategoryFieldMeta(): Category[];
    getStyleMetaHash(): string;
    isFieldMetaEnabled(): boolean;
    isCategorical(): boolean;
    isOrdinal(): boolean;
    getNumberOfCategories(): number;
    supportsFieldMeta(): boolean;
    supportsFeatureState(): boolean;
    usesFeatureState(): boolean;
    getFieldMetaRequest(): Promise<unknown | null>;
    getValueSuggestions(query: string): Promise<string[]>;
    enrichGeoJsonAndMbFeatureState(featureCollection: FeatureCollection, mbMap: MbMap, mbSourceId: string): boolean;
    getStyleMetaDataRequest(): DataRequest | undefined;
}
export declare class DynamicStyleProperty<T extends object> extends AbstractStyleProperty<T> implements IDynamicStyleProperty<T> {
    static type: STYLE_TYPE;
    protected readonly _field: IField | null;
    protected readonly _layer: IVectorLayer;
    protected readonly _getFieldFormatter: (fieldName: string) => null | FieldFormatter;
    constructor(options: T, styleName: VECTOR_STYLES, field: IField | null, vectorLayer: IVectorLayer, getFieldFormatter: (fieldName: string) => null | FieldFormatter);
    getStyleMetaDataRequest(): DataRequest | undefined;
    getValueSuggestions: (query: string) => Promise<string[]>;
    _getStyleMetaDataRequestId(fieldName: string): string | null;
    _getRangeFieldMetaFromLocalFeatures(): RangeFieldMeta | null;
    _getRangeFieldMetaFromStyleMetaRequest(): RangeFieldMeta | null;
    getRangeFieldMeta(): RangeFieldMeta | null;
    getPercentilesFieldMeta(): PercentilesFieldMeta | null;
    _getCategoryFieldMetaFromLocalFeatures(): Category[];
    _getCategoryFieldMetaFromStyleMetaRequest(): Category[];
    getCategoryFieldMeta(): Category[];
    getField(): IField | null;
    getFieldName(): string;
    getMbFieldName(): string;
    isDynamic(): boolean;
    isOrdinal(): boolean;
    isCategorical(): boolean;
    getNumberOfCategories(): number;
    getStyleMetaHash(): string;
    isComplete(): boolean;
    getFieldOrigin(): FIELD_ORIGIN | null;
    isFieldMetaEnabled(): boolean;
    supportsFieldMeta(): boolean;
    getFieldMetaRequest(): Promise<Record<string, {
        extended_stats: import("@elastic/elasticsearch/lib/api/types").AggregationsExtendedStatsAggregation;
    }> | Record<string, {
        percentiles: import("@elastic/elasticsearch/lib/api/types").AggregationsPercentilesAggregation;
    }> | Record<string, {
        terms: import("@elastic/elasticsearch/lib/api/types").AggregationsTermsAggregation;
    }> | null>;
    supportsFeatureState(): boolean;
    usesFeatureState(): boolean;
    getMbLookupFunction(): MB_LOOKUP_FUNCTION;
    getFieldMetaOptions(): FieldMetaOptions;
    getDataMappingFunction(): DATA_MAPPING_FUNCTION;
    _pluckOrdinalStyleMetaFromFieldMetaData(styleMetaData: StyleMetaData): RangeFieldMeta | null;
    _pluckCategoricalStyleMetaFromFieldMetaData(styleMetaData: StyleMetaData): Category[];
    formatField(value: RawValue): string | number;
    _getSupportedDataMappingFunctions(): DATA_MAPPING_FUNCTION[];
    renderDataMappingPopover(onChange: (updatedOptions: Partial<T>) => void): React.JSX.Element | null;
    getMbPropertyName(): string;
    getMbPropertyValue(rawValue: RawValue): RawValue;
    enrichGeoJsonAndMbFeatureState(featureCollection: FeatureCollection, mbMap: MbMap, mbSourceId: string): boolean;
}
export declare function getNumericalMbFeatureStateValue(value: RawValue): number | boolean | string[] | null | undefined;
interface PercentilesValues {
    values?: {
        [key: string]: number;
    };
}
export declare function percentilesValuesToFieldMeta(percentiles?: PercentilesValues | undefined): PercentilesFieldMeta | null;
export {};
