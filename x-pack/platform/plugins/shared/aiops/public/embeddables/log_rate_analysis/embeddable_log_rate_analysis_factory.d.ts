import { EMBEDDABLE_LOG_RATE_ANALYSIS_TYPE } from '@kbn/aiops-log-rate-analysis/constants';
import type { StartServicesAccessor } from '@kbn/core-lifecycle-browser';
import type { EmbeddablePublicDefinition } from '@kbn/embeddable-plugin/public';
import type { AiopsPluginStart, AiopsPluginStartDeps } from '../../types';
import type { LogRateAnalysisEmbeddableApi } from './types';
export type EmbeddableLogRateAnalysisType = typeof EMBEDDABLE_LOG_RATE_ANALYSIS_TYPE;
export declare const getLogRateAnalysisEmbeddableFactory: (getStartServices: StartServicesAccessor<AiopsPluginStartDeps, AiopsPluginStart>) => EmbeddablePublicDefinition<Readonly<{
    description?: string | undefined;
    title?: string | undefined;
    time_range?: Readonly<{
        mode?: "absolute" | "relative" | undefined;
    } & {
        from: string;
        to: string;
    }> | undefined;
    hide_title?: boolean | undefined;
    hide_border?: boolean | undefined;
} & {
    data_view_id: string;
}>, LogRateAnalysisEmbeddableApi>;
