import type { ChromeBreadcrumb, ChromeSetProjectBreadcrumbsParams, NavigationTreeDefinition, SolutionId } from '@kbn/core-chrome-browser';
import type { CloudSetup, CloudStart } from '@kbn/cloud-plugin/public';
import type { Observable } from 'rxjs';
import type { CardNavExtensionDefinition } from '@kbn/management-cards-navigation';
export interface ServerlessPluginSetup {
}
export interface ServerlessPluginStart {
    setBreadcrumbs: (breadcrumbs: ChromeBreadcrumb | ChromeBreadcrumb[], params?: Partial<ChromeSetProjectBreadcrumbsParams>) => void;
    initNavigation(id: SolutionId, navigationTree$: Observable<NavigationTreeDefinition>): void;
    getNavigationCards$(roleManagementEnabled?: boolean, extendCardNavDefinitions?: Record<string, CardNavExtensionDefinition>): Observable<Record<string, CardNavExtensionDefinition> | undefined>;
}
export interface ServerlessPluginSetupDependencies {
    cloud: CloudSetup;
}
export interface ServerlessPluginStartDependencies {
    cloud: CloudStart;
}
