import type { IClusterClient, KibanaRequest } from '@kbn/core/server';
import type { CheckPrivileges, CheckUserProfilesPrivileges } from '@kbn/security-plugin-types-server';
interface CheckPrivilegesActions {
    login: string;
}
export declare function checkPrivilegesFactory(actions: CheckPrivilegesActions, getClusterClient: () => Promise<IClusterClient>, applicationName: string): {
    checkPrivilegesWithRequest: (request: KibanaRequest) => CheckPrivileges;
    checkUserProfilesPrivileges: (userProfileUids: Set<string>) => CheckUserProfilesPrivileges;
};
export {};
