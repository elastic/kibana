import { EMBEDDABLE_PATTERN_ANALYSIS_TYPE } from '@kbn/aiops-log-pattern-analysis/constants';
import type { StartServicesAccessor } from '@kbn/core-lifecycle-browser';
import type { EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import type { AiopsPluginStart, AiopsPluginStartDeps } from '../../types';
import type { PatternAnalysisEmbeddableApi } from './types';
import type { PatternAnalysisEmbeddableState } from '../../../common/embeddables/pattern_analysis/types';
export type EmbeddablePatternAnalysisType = typeof EMBEDDABLE_PATTERN_ANALYSIS_TYPE;
export declare const getPatternAnalysisEmbeddableFactory: (getStartServices: StartServicesAccessor<AiopsPluginStartDeps, AiopsPluginStart>) => EmbeddableFactory<PatternAnalysisEmbeddableState, PatternAnalysisEmbeddableApi>;
