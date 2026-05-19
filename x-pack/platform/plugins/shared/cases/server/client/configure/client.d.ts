import type { FindActionResult } from '@kbn/actions-plugin/server/types';
import type { Configuration, Configurations } from '../../../common/types/domain';
import type { ConfigurationPatchRequest, ConfigurationRequest, ConnectorMappingResponse, GetConfigurationFindRequest } from '../../../common/types/api';
import type { CasesClientInternal } from '../client_internal';
import type { CasesClientArgs } from '../types';
import type { MappingsArgs, CreateMappingsArgs, UpdateMappingsArgs } from './types';
/**
 * Defines the internal helper functions.
 *
 * @ignore
 */
export interface InternalConfigureSubClient {
    getMappings(params: MappingsArgs): Promise<ConnectorMappingResponse | null>;
    createMappings(params: CreateMappingsArgs): Promise<ConnectorMappingResponse>;
    updateMappings(params: UpdateMappingsArgs): Promise<ConnectorMappingResponse>;
}
/**
 * This is the public API for interacting with the connector configuration for cases.
 */
export interface ConfigureSubClient {
    /**
     * Retrieves the external connector configuration for a particular case owner.
     */
    get(params?: GetConfigurationFindRequest): Promise<Configurations>;
    /**
     * Retrieves the valid external connectors supported by the cases plugin.
     */
    getConnectors(): Promise<FindActionResult[]>;
    /**
     * Updates a particular configuration with new values.
     *
     * @param configurationId the ID of the configuration to update
     * @param configurations the new configuration parameters
     */
    update(configurationId: string, configurations: ConfigurationPatchRequest): Promise<Configuration>;
    /**
     * Creates a configuration if one does not already exist. If one exists it is deleted and a new one is created.
     */
    create(configuration: ConfigurationRequest): Promise<Configuration>;
}
/**
 * These functions should not be exposed on the plugin contract. They are for internal use to support the CRUD of
 * configurations.
 *
 * @ignore
 */
export declare const createInternalConfigurationSubClient: (clientArgs: CasesClientArgs) => InternalConfigureSubClient;
/**
 * Creates an API object for interacting with the configuration entities
 *
 * @ignore
 */
export declare const createConfigurationSubClient: (clientArgs: CasesClientArgs, casesInternalClient: CasesClientInternal) => ConfigureSubClient;
export declare function get(params: GetConfigurationFindRequest | undefined, clientArgs: CasesClientArgs, casesClientInternal: CasesClientInternal): Promise<Configurations>;
export declare function getConnectors({ actionsClient, logger, }: CasesClientArgs): Promise<FindActionResult[]>;
export declare function update(configurationId: string, req: ConfigurationPatchRequest, clientArgs: CasesClientArgs, casesClientInternal: CasesClientInternal): Promise<Configuration>;
export declare function create(configRequest: ConfigurationRequest, clientArgs: CasesClientArgs, casesClientInternal: CasesClientInternal): Promise<Configuration>;
