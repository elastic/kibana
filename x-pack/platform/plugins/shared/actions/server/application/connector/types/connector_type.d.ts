import type { TypeOf } from '@kbn/config-schema';
import type { connectorTypeSchema } from '../schemas';
type ConnectorTypeSchemaType = TypeOf<typeof connectorTypeSchema>;
export interface ConnectorType {
    id: ConnectorTypeSchemaType['id'];
    name: ConnectorTypeSchemaType['name'];
    enabled: ConnectorTypeSchemaType['enabled'];
    enabledInConfig: ConnectorTypeSchemaType['enabledInConfig'];
    enabledInLicense: ConnectorTypeSchemaType['enabledInLicense'];
    minimumLicenseRequired: ConnectorTypeSchemaType['minimumLicenseRequired'];
    supportedFeatureIds: ConnectorTypeSchemaType['supportedFeatureIds'];
    isSystemActionType: ConnectorTypeSchemaType['isSystemActionType'];
    source: ConnectorTypeSchemaType['source'];
    subFeature?: ConnectorTypeSchemaType['subFeature'];
    isDeprecated: ConnectorTypeSchemaType['isDeprecated'];
    allowMultipleSystemActions?: ConnectorTypeSchemaType['allowMultipleSystemActions'];
    description?: ConnectorTypeSchemaType['description'];
    isExperimental?: ConnectorTypeSchemaType['isExperimental'];
}
export {};
