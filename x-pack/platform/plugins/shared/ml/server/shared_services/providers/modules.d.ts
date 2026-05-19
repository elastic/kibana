import type { KibanaRequest, SavedObjectsClientContract } from '@kbn/core/server';
import type { TypeOf } from '@kbn/config-schema';
import type { PluginStart as DataViewsPluginStart } from '@kbn/data-views-plugin/server';
import type { CompatibleModule } from '../../../common/constants/app';
import type { GetGuards } from '../shared_services';
import type { DataRecognizer } from '../../models/data_recognizer';
import type { moduleIdParamSchema, setupModuleBodySchema } from '../../routes/schemas/modules';
export type ModuleSetupPayload = TypeOf<typeof moduleIdParamSchema> & TypeOf<typeof setupModuleBodySchema>;
export interface ModulesProvider {
    modulesProvider(request: KibanaRequest, savedObjectsClient: SavedObjectsClientContract): {
        recognize: DataRecognizer['findMatches'];
        getModule: DataRecognizer['getModule'];
        listModules: DataRecognizer['listModules'];
        setup(payload: ModuleSetupPayload): ReturnType<DataRecognizer['setup']>;
    };
}
export declare function getModulesProvider(getGuards: GetGuards, getDataViews: () => DataViewsPluginStart, compatibleModuleType: CompatibleModule | null): ModulesProvider;
