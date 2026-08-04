import type { StartServicesAccessor } from '@kbn/core/public';
import type { Logger } from '@kbn/logging';
import type { RegisterManagementAppArgs } from '@kbn/management-plugin/public';
import type { PrivilegesAPIClientPublicContract, RolesAPIClient, SecurityLicense } from '@kbn/security-plugin-types-public';
import type { EventTracker } from '../analytics';
import type { ConfigType } from '../config';
import type { PluginsStart } from '../plugin';
import type { SpacesManager } from '../spaces_manager';
export interface CreateParams {
    getStartServices: StartServicesAccessor<PluginsStart>;
    spacesManager: SpacesManager;
    config: ConfigType;
    logger: Logger;
    getIsRoleManagementEnabled: () => Promise<() => boolean | undefined>;
    getRolesAPIClient: () => Promise<RolesAPIClient>;
    eventTracker: EventTracker;
    getPrivilegesAPIClient: () => Promise<PrivilegesAPIClientPublicContract>;
    isServerless: boolean;
    getSecurityLicense: () => Promise<SecurityLicense>;
}
export declare const spacesManagementApp: Readonly<{
    id: "spaces";
    create({ getStartServices, spacesManager, config, logger, eventTracker, getIsRoleManagementEnabled, getRolesAPIClient, getPrivilegesAPIClient, isServerless, getSecurityLicense, }: CreateParams): RegisterManagementAppArgs;
}>;
