import type { CoreSetup } from '@kbn/core/server';
import type { FieldsMetadataServerSetup } from '@kbn/fields-metadata-plugin/server';
import type { FleetStartContract, FleetStartDeps } from '../plugin';
interface RegistrationDeps {
    core: CoreSetup<FleetStartDeps, FleetStartContract>;
    fieldsMetadata: FieldsMetadataServerSetup;
}
export declare const registerFieldsMetadataExtractors: ({ core, fieldsMetadata }: RegistrationDeps) => void;
export {};
