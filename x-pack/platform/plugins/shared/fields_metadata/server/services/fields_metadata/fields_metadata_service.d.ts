import type { CoreStart, Logger } from '@kbn/core/server';
import type { FieldsMetadataServiceSetup, FieldsMetadataServiceStart } from './types';
export declare class FieldsMetadataService {
    private readonly logger;
    private integrationFieldsExtractor;
    private integrationListExtractor;
    private streamsFieldsExtractor;
    constructor(logger: Logger);
    setup(): FieldsMetadataServiceSetup;
    start(core: CoreStart): FieldsMetadataServiceStart;
}
