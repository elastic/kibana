import type { CoreStart } from '@kbn/core/public';
import type { PatternAnalysisEmbeddableState } from '@kbn/aiops-server-schemas/embeddables/pattern_analysis';
import type { AiopsPluginStartDeps } from '../../types';
import type { PatternAnalysisComponentApi } from './types';
export declare function resolveEmbeddablePatternAnalysisUserInput(coreStart: CoreStart, pluginStart: AiopsPluginStartDeps, parentApi: unknown, focusedPanelId: string, isNewPanel: boolean, patternAnalysisControlsApi: PatternAnalysisComponentApi, deletePanel?: () => void, initialState?: PatternAnalysisEmbeddableState): Promise<PatternAnalysisEmbeddableState>;
