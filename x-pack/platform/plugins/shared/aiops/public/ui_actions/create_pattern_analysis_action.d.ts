import type { UiActionsActionDefinition } from '@kbn/ui-actions-plugin/public';
import type { PatternAnalysisActionContext } from './pattern_analysis_action_context';
import type { AiopsCoreSetup } from '../types';
export declare function createAddPatternAnalysisEmbeddableAction(getStartServices: AiopsCoreSetup['getStartServices']): UiActionsActionDefinition<PatternAnalysisActionContext>;
