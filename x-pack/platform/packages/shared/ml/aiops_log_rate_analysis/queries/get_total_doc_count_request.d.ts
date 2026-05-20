import type { estypes } from '@elastic/elasticsearch';
import type { AiopsLogRateAnalysisSchema } from '../api/schema';
export declare const getTotalDocCountRequest: (params: AiopsLogRateAnalysisSchema) => estypes.SearchRequest;
