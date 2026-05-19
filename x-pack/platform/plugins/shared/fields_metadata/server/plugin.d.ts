import type { PluginInitializerContext, CoreStart, Plugin } from '@kbn/core/server';
import type { FieldsMetadataPluginCoreSetup, FieldsMetadataServerSetup, FieldsMetadataServerStart, FieldsMetadataServerPluginSetupDeps, FieldsMetadataServerPluginStartDeps } from './types';
export declare class FieldsMetadataPlugin implements Plugin<FieldsMetadataServerSetup, FieldsMetadataServerStart, FieldsMetadataServerPluginSetupDeps, FieldsMetadataServerPluginStartDeps> {
    private readonly logger;
    private libs;
    private fieldsMetadataService;
    constructor(context: PluginInitializerContext);
    setup(core: FieldsMetadataPluginCoreSetup, plugins: FieldsMetadataServerPluginSetupDeps): {
        registerIntegrationFieldsExtractor: (extractor: import("./services/fields_metadata/types").IntegrationFieldsExtractor) => void;
        registerIntegrationListExtractor: (extractor: import("./services/fields_metadata/types").IntegrationListExtractor) => void;
        registerStreamsFieldsExtractor: (extractor: import("./services/fields_metadata/types").StreamsFieldsExtractor) => void;
    };
    start(core: CoreStart, _plugins: FieldsMetadataServerPluginStartDeps): {
        getClient: (request: import("@kbn/core/server").KibanaRequest) => Promise<import(".").IFieldsMetadataClient>;
    };
}
