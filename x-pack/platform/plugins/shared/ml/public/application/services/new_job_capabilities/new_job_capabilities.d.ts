import type { Aggregation, Field, NewJobCaps } from '@kbn/ml-anomaly-utils';
export declare function processTextAndKeywordFields(fields: Field[]): {
    fieldsPreferringKeyword: Field[];
    fieldsPreferringText: Field[];
};
export declare class NewJobCapabilitiesServiceBase {
    protected _fields: Field[];
    protected _aggs: Aggregation[];
    constructor();
    get fields(): Field[];
    get aggs(): Aggregation[];
    get newJobCaps(): NewJobCaps;
    getFieldById(id: string): Field | null;
    getAggById(id: string): Aggregation | null;
    protected removeCounterFields(): void;
}
