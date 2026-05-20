import type { UiActionsActionDefinition } from '@kbn/ui-actions-plugin/public';
import type { MlCoreSetup } from '../plugin';
import type { AnomalyChartsFieldSelectionContext } from '../embeddables';
export declare const APPLY_ENTITY_FIELD_FILTERS_ACTION = "applyEntityFieldFiltersAction";
export declare function createApplyEntityFieldFiltersAction(getStartServices: MlCoreSetup['getStartServices'], constrolledBy?: string): UiActionsActionDefinition<AnomalyChartsFieldSelectionContext>;
