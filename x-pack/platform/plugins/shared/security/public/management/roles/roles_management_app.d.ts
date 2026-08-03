import type { BuildFlavor } from '@kbn/config';
import type { FatalErrorsSetup, StartServicesAccessor } from '@kbn/core/public';
import type { RegisterManagementAppArgs } from '@kbn/management-plugin/public';
import type { SecurityLicense } from '../../../common';
import type { PluginStartDependencies } from '../../plugin';
interface CreateParams {
    fatalErrors: FatalErrorsSetup;
    license: SecurityLicense;
    getStartServices: StartServicesAccessor<PluginStartDependencies>;
    buildFlavor: BuildFlavor;
}
export declare const rolesManagementApp: Readonly<{
    id: "roles";
    create({ license, getStartServices, buildFlavor }: CreateParams): RegisterManagementAppArgs;
}>;
export {};
