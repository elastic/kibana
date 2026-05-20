import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
type SetBreadcrumbs = ManagementAppMountParams['setBreadcrumbs'];
export declare class BreadcrumbService {
    private breadcrumbs;
    private setBreadcrumbsHandler?;
    setup(setBreadcrumbsHandler: SetBreadcrumbs): void;
    setBreadcrumbs(type: 'create' | 'home' | 'edit' | 'manage_processors'): void;
}
export declare const breadcrumbService: BreadcrumbService;
export {};
