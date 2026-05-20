import type { GetConnectorSpecParams } from './types';
export declare function getConnectorSpecAsJsonSchema({ context, id, configurationUtilities, }: GetConnectorSpecParams): Promise<{
    metadata: import("@kbn/connector-specs").ConnectorMetadata;
    schema: Record<string, unknown>;
}>;
