import type { InstallContext } from '../_state_machine_package_install';
export declare const updateLatestExecutedState: (context: InstallContext) => Promise<import("@kbn/core/server").SavedObjectsUpdateResponse<{
    latest_executed_state: import("../../../../../../common/types").LatestExecutedState<import("../../../../../../common/types").StateNames>;
}> | undefined>;
export declare const cleanupLatestExecutedState: (context: InstallContext) => Promise<import("@kbn/core/server").SavedObjectsUpdateResponse<{
    latest_executed_state: {};
}> | undefined>;
