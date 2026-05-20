import type { HttpSetup } from '@kbn/core/public';
import type { ResilientFieldMetadata } from './types';
export declare const BASE_ACTION_API_PATH = "/api/actions";
export interface Props {
    http: HttpSetup;
    connectorId: string;
    signal?: AbortSignal;
}
export declare function getFields({ http, connectorId, signal }: Props): Promise<import("@kbn/actions-plugin/common").ActionTypeExecutorResult<ResilientFieldMetadata[]>>;
