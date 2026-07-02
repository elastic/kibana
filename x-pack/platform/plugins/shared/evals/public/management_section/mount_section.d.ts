import type { CoreSetup } from '@kbn/core/public';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
interface MountSectionParams {
    core: CoreSetup;
    mountParams: ManagementAppMountParams;
}
export declare const mountManagementSection: ({ core, mountParams: { element, setBreadcrumbs, history }, }: MountSectionParams) => Promise<() => void>;
export {};
