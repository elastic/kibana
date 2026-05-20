import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
type SetBreadcrumbs = ManagementAppMountParams['setBreadcrumbs'];
export declare class BreadcrumbService {
    private breadcrumbs;
    private setBreadcrumbsHandler?;
    setup(setBreadcrumbsHandler: SetBreadcrumbs): void;
    setBreadcrumbs(type: 'dashboard' | 'upload'): void;
}
export {};
