import type { AxiosInstance } from 'axios';
import type { ActionsClientContext } from '../../../../actions_client';
type ValidatedSecrets = Record<string, unknown>;
export type GetAxiosInstanceWithAuthFn = (secrets: ValidatedSecrets) => Promise<AxiosInstance>;
export declare function getAxiosInstance(context: ActionsClientContext, connectorId: string): Promise<AxiosInstance>;
export {};
