import type { MapsSetupApi } from '@kbn/maps-plugin/public';
import type { MlCoreSetup } from '../plugin';
export declare function registerMapExtension(mapsSetupApi: MapsSetupApi, core: MlCoreSetup, { canGetJobs, canCreateJobs }: {
    canGetJobs: boolean;
    canCreateJobs: boolean;
}): Promise<void>;
