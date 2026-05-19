import type { CoreStart } from '@kbn/core/public';
import type { AiopsPluginStartDeps } from '../../types';
import type { PatternAnalysisComponentApi } from './types';
import type { PatternAnalysisEmbeddableState } from '../../../common/embeddables/pattern_analysis/types';
export declare function resolveEmbeddablePatternAnalysisUserInput(coreStart: CoreStart, pluginStart: AiopsPluginStartDeps, parentApi: unknown, focusedPanelId: string, isNewPanel: boolean, patternAnalysisControlsApi: PatternAnalysisComponentApi, deletePanel?: () => void, initialState?: PatternAnalysisEmbeddableState): Promise<PatternAnalysisEmbeddableState>;
