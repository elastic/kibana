import type { UiActionsActionDefinition } from '@kbn/ui-actions-plugin/public';
import type { LogRateAnalysisActionContext } from './log_rate_analysis_action_context';
import type { AiopsCoreSetup } from '../types';
export declare function createAddLogRateAnalysisEmbeddableAction(getStartServices: AiopsCoreSetup['getStartServices']): UiActionsActionDefinition<LogRateAnalysisActionContext>;
