import type { FieldsMetadataServiceStartDeps, FieldsMetadataServiceSetup, FieldsMetadataServiceStart } from './types';
export declare class FieldsMetadataService {
    private client?;
    setup(): FieldsMetadataServiceSetup;
    start({ http }: FieldsMetadataServiceStartDeps): FieldsMetadataServiceStart;
    private getClient;
}
