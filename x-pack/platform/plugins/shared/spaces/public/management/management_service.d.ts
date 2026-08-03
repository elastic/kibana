import type { ManagementSetup } from '@kbn/management-plugin/public';
import { type CreateParams as SpacesManagementAppCreateParams } from './spaces_management_app';
interface SetupDeps extends SpacesManagementAppCreateParams {
    management: ManagementSetup;
}
export declare class ManagementService {
    private registeredSpacesManagementApp?;
    setup({ getStartServices, management, spacesManager, config, logger, getIsRoleManagementEnabled, getRolesAPIClient, eventTracker, getPrivilegesAPIClient, isServerless, getSecurityLicense, }: SetupDeps): void;
    stop(): void;
    private disableSpacesApp;
}
export {};
