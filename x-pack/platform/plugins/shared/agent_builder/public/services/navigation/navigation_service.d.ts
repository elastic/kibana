import type { LicenseManagementLocator } from '@kbn/license-management-plugin/public/locator';
import type { ManagementAppLocatorParams } from '@kbn/management-plugin/common/locator';
import type { LocatorPublic } from '@kbn/share-plugin/common';
interface AgentBuilderNavigationLocators {
    management: LocatorPublic<ManagementAppLocatorParams>;
    licenseManagement?: LicenseManagementLocator;
}
export declare class NavigationService {
    private locators;
    constructor(locators: AgentBuilderNavigationLocators);
    hasLicenseManagentLocator(): boolean;
    navigateToLicenseManagementDashboard(): void;
    navigateToLlmConnectorsManagement(): void;
}
export {};
