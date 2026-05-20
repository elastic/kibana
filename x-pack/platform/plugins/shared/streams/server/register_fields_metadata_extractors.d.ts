import type { Logger } from '@kbn/core/server';
import type { FieldsMetadataServerSetup } from '@kbn/fields-metadata-plugin/server';
interface RegistrationDeps {
    fieldsMetadata: FieldsMetadataServerSetup;
    logger: Logger;
}
/**
 * Registers a streams field extractor with the fields_metadata service.
 * This allows the ESQL editor and field sidebar to display field descriptions
 * for streams. The extractor receives a request-scoped ES client so that
 * Elasticsearch-level read permissions are respected.
 */
export declare const registerFieldsMetadataExtractors: ({ fieldsMetadata, logger }: RegistrationDeps) => void;
export {};
