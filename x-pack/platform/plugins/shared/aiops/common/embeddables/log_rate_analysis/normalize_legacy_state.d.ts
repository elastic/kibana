import type { LogRateAnalysisEmbeddableState } from '@kbn/aiops-server-schemas/embeddables/log_rate_analysis';
export interface LegacyLogRateAnalysisFields {
    dataViewId?: string;
}
export type RawLogRateAnalysisState = Partial<LogRateAnalysisEmbeddableState> & LegacyLogRateAnalysisFields;
interface NormalizedLogRateAnalysisFields {
    data_view_id: string | undefined;
}
export declare const normalizeLogRateAnalysisLegacyFields: (state: RawLogRateAnalysisState) => NormalizedLogRateAnalysisFields;
export {};
