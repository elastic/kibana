import type { KibanaRequest } from '@kbn/core/server';
import type { MlCapabilities, MlCapabilitiesResponse, ResolveMlCapabilities, MlCapabilitiesKey } from '@kbn/ml-common-types/capabilities';
import type { MlClient } from '../ml_client';
import type { MlLicense } from '../../../common/license';
export declare function capabilitiesProvider(mlClient: MlClient, capabilities: MlCapabilities, mlLicense: MlLicense, isMlEnabledInSpace: () => Promise<boolean>): {
    getCapabilities: () => Promise<MlCapabilitiesResponse>;
};
export type HasMlCapabilities = (capabilities: MlCapabilitiesKey[]) => Promise<void>;
export declare function hasMlCapabilitiesProvider(resolveMlCapabilities: ResolveMlCapabilities, request: KibanaRequest): (capabilities: MlCapabilitiesKey[]) => Promise<void>;
