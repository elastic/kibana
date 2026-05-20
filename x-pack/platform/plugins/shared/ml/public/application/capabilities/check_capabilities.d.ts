import { BehaviorSubject } from 'rxjs';
import { type MlCapabilities, type MlCapabilitiesKey } from '@kbn/ml-common-types/capabilities';
import type { MlApi } from '../services/ml_api_service';
import type { MlGlobalServices } from '../app';
import type { MlCoreSetup } from '../../plugin';
export declare class MlCapabilitiesService {
    private readonly mlApi;
    private _isLoading$;
    /**
     * Updates on manual request, e.g. in the route resolver.
     * @internal
     */
    private _updateRequested$;
    private _capabilities$;
    private _capabilitiesObs$;
    private _isPlatinumOrTrialLicense$;
    private _mlFeatureEnabledInSpace$;
    private _isUpgradeInProgress$;
    capabilities$: import("rxjs").Observable<any>;
    private _subscription;
    constructor(mlApi: MlApi);
    private init;
    getCapabilities(): MlCapabilities | null;
    isPlatinumOrTrialLicense(): boolean | null;
    mlFeatureEnabledInSpace(): boolean | null;
    isUpgradeInProgress$(): BehaviorSubject<boolean | null>;
    isUpgradeInProgress(): boolean | null;
    getCapabilities$(): import("rxjs").Observable<MlCapabilities | null>;
    refreshCapabilities(): void;
    destroy(): void;
}
/**
 * Check the privilege type and the license to see whether a user has permission to access a feature.
 *
 * @param capability
 */
export declare function usePermissionCheck<T extends MlCapabilitiesKey | MlCapabilitiesKey[]>(capability: T): T extends MlCapabilitiesKey ? boolean : boolean[];
/**
 * Check whether upgrade mode has been set.
 */
export declare function useUpgradeCheck(): boolean;
export declare function checkGetManagementMlJobsResolver({ mlCapabilities }: MlGlobalServices): Promise<void>;
export declare function checkCreateJobsCapabilitiesResolver(mlApi: MlApi, redirectToJobsManagementPage: () => Promise<void>): Promise<MlCapabilities>;
/**
 * @deprecated use {@link usePermissionCheck} instead.
 * @param capability
 */
export declare function checkPermission(capability: keyof MlCapabilities): boolean;
export declare function checkPermissionAsync(getStartServices: MlCoreSetup['getStartServices'], capability: keyof MlCapabilities, throwError?: boolean): Promise<boolean>;
export declare function createPermissionFailureMessage(privilegeType: keyof MlCapabilities): string;
