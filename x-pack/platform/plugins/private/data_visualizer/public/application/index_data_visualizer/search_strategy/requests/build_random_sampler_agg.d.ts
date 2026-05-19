import type { estypes } from '@elastic/elasticsearch';
import type { Aggs, SamplingOption } from '../../../../../common/types/field_stats';
export declare function buildAggregationWithSamplingOption(aggs: Aggs, samplingOption: SamplingOption): Record<string, estypes.AggregationsAggregationContainer>;
