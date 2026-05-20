import type { StartServicesAccessor } from '@kbn/core/public';
import type { RegisterManagementAppArgs } from '@kbn/management-plugin/public';
import type { PluginStartDependencies } from '../../plugin';
interface CreateParams {
    getStartServices: StartServicesAccessor<PluginStartDependencies>;
}
export declare const roleMappingsManagementApp: Readonly<{
    id: "role_mappings";
    create({ getStartServices }: CreateParams): RegisterManagementAppArgs;
}>;
export {};
