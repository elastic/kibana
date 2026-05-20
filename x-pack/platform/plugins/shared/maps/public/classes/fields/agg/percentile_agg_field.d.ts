import type { DataView } from '@kbn/data-plugin/common';
import type { IESAggField, CountAggFieldParams } from './agg_field_types';
import type { ESDocField } from '../es_doc_field';
import { AggField } from './agg_field';
interface PercentileAggParams extends CountAggFieldParams {
    esDocField?: ESDocField;
    percentile: number;
}
export declare class PercentileAggField extends AggField implements IESAggField {
    private readonly _percentile;
    constructor(params: PercentileAggParams);
    supportsFieldMetaFromEs(): boolean;
    supportsFieldMetaFromLocalData(): boolean;
    getMbFieldName(): string;
    canValueBeFormatted(): boolean;
    getLabel(): Promise<string>;
    getName(): string;
    getValueAggDsl(indexPattern: DataView): unknown;
}
export {};
