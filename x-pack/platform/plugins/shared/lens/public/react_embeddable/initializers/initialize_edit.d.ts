import type { HasEditCapabilities, HasReadOnlyCapabilities, HasSupportedTriggers, PublishesDisabledActionIds, PublishesViewMode } from '@kbn/presentation-publishing';
import type { GetStateType, LensHasEditPanel, LensInspectorAdapters, LensInternalApi, LensRuntimeState } from '@kbn/lens-common';
import type { LensEmbeddableStartServices } from '../types';
import type { StateManagementConfig } from './initialize_state_management';
import type { SearchContextConfig } from './initialize_search_context';
/**
 * Initialize the edit API for the embeddable
 **/
export declare function initializeEditApi(uuid: string, initialState: LensRuntimeState, getState: GetStateType, internalApi: LensInternalApi, stateApi: StateManagementConfig['api'], inspectorApi: LensInspectorAdapters, searchContextApi: SearchContextConfig['api'], isTextBasedLanguage: (currentState: LensRuntimeState) => boolean, startDependencies: LensEmbeddableStartServices, parentApi?: unknown): {
    api: HasSupportedTriggers & PublishesDisabledActionIds & HasEditCapabilities & HasReadOnlyCapabilities & PublishesViewMode & {
        uuid: string;
    } & LensHasEditPanel;
};
