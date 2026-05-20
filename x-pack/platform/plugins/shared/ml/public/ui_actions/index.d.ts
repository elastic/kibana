import type { CoreSetup } from '@kbn/core/public';
import type { UiActionsSetup } from '@kbn/ui-actions-plugin/public';
import type { MlPluginStart, MlStartDependencies } from '../plugin';
/**
 * Register ML UI actions
 */
export declare function registerMlUiActions(uiActions: UiActionsSetup, core: CoreSetup<MlStartDependencies, MlPluginStart>): void;
