import type { UiActionsActionDefinition } from '@kbn/ui-actions-plugin/public';
import type { ChangePointChartActionContext } from './change_point_action_context';
import type { AiopsCoreSetup } from '../types';
export declare function createAddChangePointChartAction(getStartServices: AiopsCoreSetup['getStartServices']): UiActionsActionDefinition<ChangePointChartActionContext>;
