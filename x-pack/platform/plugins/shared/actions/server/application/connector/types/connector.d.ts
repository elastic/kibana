import type { TypeOf } from '@kbn/config-schema';
import type { connectorSchema, connectorWithExtraFindDataSchema } from '../schemas';
type ConnectorSchemaType = TypeOf<typeof connectorSchema>;
type ConnectorWithExtraFindDataSchema = TypeOf<typeof connectorWithExtraFindDataSchema>;
export interface Connector {
    id: ConnectorSchemaType['id'];
    actionTypeId: ConnectorSchemaType['actionTypeId'];
    name: ConnectorSchemaType['name'];
    isMissingSecrets?: ConnectorSchemaType['isMissingSecrets'];
    config?: ConnectorSchemaType['config'];
    isPreconfigured: ConnectorSchemaType['isPreconfigured'];
    isDeprecated: ConnectorSchemaType['isDeprecated'];
    isSystemAction: ConnectorSchemaType['isSystemAction'];
    isConnectorTypeDeprecated: ConnectorSchemaType['isConnectorTypeDeprecated'];
    authMode?: ConnectorSchemaType['authMode'];
}
export interface ConnectorWithExtraFindData extends Connector {
    referencedByCount: ConnectorWithExtraFindDataSchema['referencedByCount'];
}
export {};
