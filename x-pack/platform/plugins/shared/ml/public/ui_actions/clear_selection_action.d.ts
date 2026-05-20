import type { UiActionsActionDefinition } from '@kbn/ui-actions-plugin/public';
import type { MlCoreSetup } from '../plugin';
export declare const CLEAR_SELECTION_ACTION = "clearSelectionAction";
export interface ClearSelectionContext {
    updateCallback: () => void;
}
export declare function createClearSelectionAction(getStartServices: MlCoreSetup['getStartServices']): UiActionsActionDefinition<ClearSelectionContext>;
