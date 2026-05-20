import type { UiActionsActionDefinition } from '@kbn/ui-actions-plugin/public';
import { type CreateCategorizationADJobContext } from '@kbn/ml-ui-actions';
import type { MlCoreSetup } from '../plugin';
export declare function createCategorizationADJobAction(getStartServices: MlCoreSetup['getStartServices']): UiActionsActionDefinition<CreateCategorizationADJobContext>;
