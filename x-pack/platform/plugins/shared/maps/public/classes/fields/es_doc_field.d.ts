import type { DataViewField } from '@kbn/data-views-plugin/public';
import type { AggregationsExtendedStatsAggregation, AggregationsPercentilesAggregation, AggregationsTermsAggregation } from '@elastic/elasticsearch/lib/api/types';
import type { FIELD_ORIGIN } from '../../../common/constants';
import type { ITooltipProperty } from '../tooltips/tooltip_property';
import type { IField } from './field';
import { AbstractField } from './field';
import type { IESSource } from '../sources/es_source';
import type { IVectorSource } from '../sources/vector_source';
export declare class ESDocField extends AbstractField implements IField {
    private readonly _source;
    constructor({ fieldName, source, origin, }: {
        fieldName: string;
        source: IVectorSource & Pick<IESSource, 'getIndexPattern'>;
        origin: FIELD_ORIGIN;
    });
    supportsFieldMetaFromEs(): boolean;
    supportsFieldMetaFromLocalData(): boolean;
    canValueBeFormatted(): boolean;
    getSource(): IVectorSource;
    _getIndexPatternField(): Promise<DataViewField | undefined>;
    createTooltipProperty(value: string | string[] | undefined): Promise<ITooltipProperty>;
    getDataType(): Promise<string>;
    getLabel(): Promise<string>;
    getExtendedStatsFieldMetaRequest(): Promise<Record<string, {
        extended_stats: AggregationsExtendedStatsAggregation;
    }> | null>;
    getPercentilesFieldMetaRequest(percentiles: number[]): Promise<Record<string, {
        percentiles: AggregationsPercentilesAggregation;
    }> | null>;
    getCategoricalFieldMetaRequest(size: number): Promise<Record<string, {
        terms: AggregationsTermsAggregation;
    }> | null>;
}
