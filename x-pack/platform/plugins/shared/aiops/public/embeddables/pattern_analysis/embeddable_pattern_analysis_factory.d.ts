import { EMBEDDABLE_PATTERN_ANALYSIS_TYPE } from '@kbn/aiops-log-pattern-analysis/constants';
import type { StartServicesAccessor } from '@kbn/core-lifecycle-browser';
import type { EmbeddablePublicDefinition } from '@kbn/embeddable-plugin/public';
import type { AiopsPluginStart, AiopsPluginStartDeps } from '../../types';
import type { PatternAnalysisEmbeddableApi } from './types';
export type EmbeddablePatternAnalysisType = typeof EMBEDDABLE_PATTERN_ANALYSIS_TYPE;
export declare const getPatternAnalysisEmbeddableFactory: (getStartServices: StartServicesAccessor<AiopsPluginStartDeps, AiopsPluginStart>) => EmbeddablePublicDefinition<Readonly<{
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
    field_name: string;
    minimum_time_range: "no_minimum" | "1_week" | "1_month" | "3_months" | "6_months";
    random_sampler_mode: "off" | "on_automatic" | "on_manual";
    random_sampler_probability: number | null;
}>, PatternAnalysisEmbeddableApi>;
