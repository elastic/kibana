import type { DataView } from '@kbn/data-views-plugin/public';
import { type RuntimeMappings } from '@kbn/ml-runtime-field-utils';
import type { estypes } from '@elastic/elasticsearch';
import type { MlApi } from '../../../services/ml_api_service';
import type { FieldHistogramRequestConfig } from '../common/request';
export declare class DataLoader {
    private _indexPattern;
    private _mlApi;
    private _runtimeMappings;
    private _indexPatternTitle;
    private _maxExamples;
    constructor(_indexPattern: DataView, _mlApi: MlApi);
    loadFieldHistograms(fields: FieldHistogramRequestConfig[], query: string | estypes.QueryDslQueryContainer, samplerShardSize?: number, editorRuntimeMappings?: RuntimeMappings, projectRouting?: string): Promise<any[]>;
    set maxExamples(max: number);
    get maxExamples(): number;
    isDisplayField(fieldName: string): boolean;
}
