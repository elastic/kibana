import type { HasLibraryTransforms, PublishesWritableTitle, PublishesWritableDescription, SerializedTitles, StateComparators, initializeTitleManager } from '@kbn/presentation-publishing';
import type { Observable } from 'rxjs';
import type { LensPanelProps, LensRuntimeState, LensOverrides, LensSharedProps, IntegrationCallbacks, LensInternalApi } from '@kbn/lens-common';
import type { LensApi, LensWireAPIConfig } from '@kbn/lens-common-2';
import type { LensEmbeddableStartServices } from '../types';
import type { StateManagementConfig } from './initialize_state_management';
type SerializedProps = SerializedTitles & LensPanelProps & LensOverrides & LensSharedProps;
export declare const dashboardServicesComparators: StateComparators<SerializedProps>;
export interface DashboardServicesConfig {
    api: PublishesWritableTitle & PublishesWritableDescription & HasLibraryTransforms<LensWireAPIConfig, LensWireAPIConfig> & Pick<LensApi, 'parentApi'> & Pick<IntegrationCallbacks, 'updateOverrides' | 'getTriggerCompatibleActions'>;
    anyStateChange$: Observable<void>;
    getLatestState: () => SerializedProps;
    reinitializeState: (lastSaved?: LensWireAPIConfig) => void;
}
/**
 * Everything about panel and library services
 */
export declare function initializeDashboardServices(initialState: LensRuntimeState, getLatestState: () => LensRuntimeState, internalApi: LensInternalApi, stateConfig: StateManagementConfig, parentApi: unknown, titleManager: ReturnType<typeof initializeTitleManager>, { attributeService, uiActions }: LensEmbeddableStartServices): DashboardServicesConfig;
export {};
