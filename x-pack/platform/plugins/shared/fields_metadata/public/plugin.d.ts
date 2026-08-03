import type { CoreStart } from '@kbn/core/public';
import type { FieldsMetadataClientPluginClass } from './types';
export declare class FieldsMetadataPlugin implements FieldsMetadataClientPluginClass {
    private fieldsMetadata;
    constructor();
    setup(): {};
    start(core: CoreStart): {
        getClient: () => Promise<import("./services/fields_metadata").IFieldsMetadataClient>;
        useFieldsMetadata: import("./hooks/use_fields_metadata").UseFieldsMetadataHook;
    };
}
