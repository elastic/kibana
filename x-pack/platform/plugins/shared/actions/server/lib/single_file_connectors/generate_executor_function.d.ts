import type { ConnectorSpec } from '@kbn/connector-specs';
import type { ActionTypeExecutorOptions as ConnectorTypeExecutorOptions, ActionTypeExecutorResult as ConnectorTypeExecutorResult } from '../../types';
import type { GetAxiosInstanceWithAuthFn } from '../get_axios_instance';
type RecordUnknown = Record<string, unknown>;
export declare const generateExecutorFunction: ({ actions, getAxiosInstanceWithAuth, }: {
    actions: ConnectorSpec["actions"];
    getAxiosInstanceWithAuth: GetAxiosInstanceWithAuthFn;
}) => (execOptions: ConnectorTypeExecutorOptions<RecordUnknown, RecordUnknown, RecordUnknown>) => Promise<ConnectorTypeExecutorResult<unknown>>;
export {};
