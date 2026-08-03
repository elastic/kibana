import type { ChangePointChartEmbeddableState } from '@kbn/aiops-server-schemas/embeddables/change_point_chart';
import type { PatternAnalysisEmbeddableState } from '@kbn/aiops-server-schemas/embeddables/pattern_analysis';
import type { LogRateAnalysisEmbeddableState } from '@kbn/aiops-server-schemas/embeddables/log_rate_analysis';
import type { EmbeddableChangePointChartType } from '../embeddables/change_point_chart/embeddable_change_point_chart_factory';
import type { EmbeddablePatternAnalysisType } from '../embeddables/pattern_analysis/embeddable_pattern_analysis_factory';
import type { EmbeddableLogRateAnalysisType } from '../embeddables/log_rate_analysis/embeddable_log_rate_analysis_factory';
type SupportedEmbeddableTypes = EmbeddableChangePointChartType | EmbeddablePatternAnalysisType | EmbeddableLogRateAnalysisType;
type EmbeddableRuntimeState<T extends SupportedEmbeddableTypes> = T extends EmbeddableChangePointChartType ? ChangePointChartEmbeddableState : T extends EmbeddablePatternAnalysisType ? PatternAnalysisEmbeddableState : T extends EmbeddableLogRateAnalysisType ? LogRateAnalysisEmbeddableState : never;
/**
 * Returns a callback for opening the cases modal with provided attachment state.
 */
export declare const useCasesModal: <EmbeddableType extends SupportedEmbeddableTypes>(embeddableType: EmbeddableType, title: string) => (persistableState: Partial<Omit<EmbeddableRuntimeState<EmbeddableType>, "id">>) => void;
export {};
