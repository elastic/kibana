import type { LogRateAnalysisEmbeddableState } from '@kbn/aiops-server-schemas/embeddables/log_rate_analysis';
export type StoredLogRateAnalysisEmbeddableState = Omit<LogRateAnalysisEmbeddableState, 'data_view_id'>;
