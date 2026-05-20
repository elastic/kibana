import type { GetStateType, IntegrationCallbacks } from '@kbn/lens-common';
import type { LegacyLensStateApi, LensWireAPIConfig } from '@kbn/lens-common-2';
import type { HasSerializableState } from '@kbn/presentation-publishing';
export declare function initializeIntegrations(getLatestState: GetStateType): {
    api: Omit<IntegrationCallbacks, 'updateState' | 'updateAttributes' | 'updateDataViews' | 'updateRefId' | 'updateOverrides' | 'updateDataLoading' | 'getTriggerCompatibleActions'> & Pick<HasSerializableState<LensWireAPIConfig>, 'serializeState'> & LegacyLensStateApi;
};
