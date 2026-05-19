import { EMBEDDABLE_LOG_RATE_ANALYSIS_TYPE } from '@kbn/aiops-log-rate-analysis/constants';
import type { StartServicesAccessor } from '@kbn/core-lifecycle-browser';
import type { EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import type { AiopsPluginStart, AiopsPluginStartDeps } from '../../types';
import type { LogRateAnalysisEmbeddableApi } from './types';
import type { LogRateAnalysisEmbeddableState } from '../../../common/embeddables/log_rate_analysis/types';
export type EmbeddableLogRateAnalysisType = typeof EMBEDDABLE_LOG_RATE_ANALYSIS_TYPE;
export declare const getLogRateAnalysisEmbeddableFactory: (getStartServices: StartServicesAccessor<AiopsPluginStartDeps, AiopsPluginStart>) => EmbeddableFactory<LogRateAnalysisEmbeddableState, LogRateAnalysisEmbeddableApi>;
