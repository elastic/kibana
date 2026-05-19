import type { Container } from 'inversify';
import type { AppMountParameters, AppUnmount } from '@kbn/core-application-browser';
import type { ChromeBreadcrumb, CoreStart } from '@kbn/core/public';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
interface AlertingV2MountParams {
    element: HTMLElement;
    history: AppMountParameters['history'];
    setBreadcrumbs: (crumbs: ChromeBreadcrumb[]) => void;
}
export declare const mountAlertingV2App: ({ params, container, coreStart, }: {
    params: AlertingV2MountParams;
    container: Container;
    coreStart: CoreStart;
}) => Promise<AppUnmount>;
export declare const mountRuleDoctorApp: ({ params, container, coreStart, }: {
    params: AlertingV2MountParams;
    container: Container;
    coreStart: CoreStart;
}) => Promise<AppUnmount>;
export declare const mountEpisodesApp: ({ params, container, coreStart, }: {
    params: ManagementAppMountParams;
    container: Container;
    coreStart: CoreStart;
}) => Promise<AppUnmount>;
export declare const mountActionPoliciesApp: ({ params, container, coreStart, }: {
    params: AlertingV2MountParams;
    container: Container;
    coreStart: CoreStart;
}) => Promise<AppUnmount>;
export declare const mountExecutionHistoryApp: ({ params, container, coreStart, }: {
    params: AlertingV2MountParams;
    container: Container;
    coreStart: CoreStart;
}) => Promise<AppUnmount>;
export {};
