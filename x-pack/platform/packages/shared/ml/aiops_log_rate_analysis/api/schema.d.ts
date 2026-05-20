import type { AiopsLogRateAnalysisSchemaV2 } from './schema_v2';
import type { AiopsLogRateAnalysisSchemaV3 } from './schema_v3';
export type AiopsLogRateAnalysisApiVersion = '2' | '3';
declare const LATEST_API_VERSION: AiopsLogRateAnalysisApiVersion;
export type AiopsLogRateAnalysisSchema<T extends AiopsLogRateAnalysisApiVersion = typeof LATEST_API_VERSION> = T extends '2' ? AiopsLogRateAnalysisSchemaV2 : T extends '3' ? AiopsLogRateAnalysisSchemaV3 : never;
export {};
