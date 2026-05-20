import type { AxiosHeaderValue, AxiosInstance } from 'axios';
import type { Logger } from '@kbn/core/server';
import type { AuthMode } from '@kbn/connector-specs';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { ActionInfo } from './action_executor';
import type { AuthTypeRegistry } from '../auth_types';
import type { ActionsConfigurationUtilities } from '../actions_config';
import type { ConnectorTokenClientContract } from '../types';
export type ConnectorInfo = Omit<ActionInfo, 'rawAction'>;
export declare const buildUserAgent: (cloud?: CloudSetup) => string;
interface GetAxiosInstanceOpts {
    authTypeRegistry: AuthTypeRegistry;
    cloud?: CloudSetup;
    configurationUtilities: ActionsConfigurationUtilities;
    logger: Logger;
}
type ValidatedSecrets = Record<string, unknown>;
export interface GetAxiosInstanceWithAuthFnOpts {
    additionalHeaders?: Record<string, AxiosHeaderValue>;
    connectorId: string;
    connectorTokenClient?: ConnectorTokenClientContract;
    secrets: ValidatedSecrets;
    signal?: AbortSignal;
    authMode?: AuthMode;
    profileUid?: string;
}
export type GetAxiosInstanceWithAuthFn = (opts: GetAxiosInstanceWithAuthFnOpts) => Promise<AxiosInstance>;
export declare const getAxiosInstanceWithAuth: ({ authTypeRegistry, cloud, configurationUtilities, logger, }: GetAxiosInstanceOpts) => GetAxiosInstanceWithAuthFn;
export {};
