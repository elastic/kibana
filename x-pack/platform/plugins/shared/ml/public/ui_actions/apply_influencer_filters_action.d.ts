import type { UiActionsActionDefinition } from '@kbn/ui-actions-plugin/public';
import type { SwimLaneDrilldownContext } from '../embeddables';
import type { MlCoreSetup } from '../plugin';
export declare const APPLY_INFLUENCER_FILTERS_ACTION = "applyInfluencerFiltersAction";
export declare function createApplyInfluencerFiltersAction(getStartServices: MlCoreSetup['getStartServices']): UiActionsActionDefinition<SwimLaneDrilldownContext>;
