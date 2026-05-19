import type { UiActionsActionDefinition } from '@kbn/ui-actions-plugin/public';
import type { ChangePointChartActionContext } from './change_point_action_context';
import type { AiopsCoreSetup } from '../types';
export declare const OPEN_CHANGE_POINT_IN_ML_APP_ACTION = "openChangePointInMlAppAction";
export declare function createOpenChangePointInMlAppAction(getStartServices: AiopsCoreSetup['getStartServices']): UiActionsActionDefinition<ChangePointChartActionContext>;
