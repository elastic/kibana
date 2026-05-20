import type { HttpSetup } from '@kbn/core/public';
import type { Choice } from './types';
export declare const BASE_ACTION_API_PATH = "/api/actions";
export interface GetChoicesProps {
    http: HttpSetup;
    connectorId: string;
    fields: string[];
    signal?: AbortSignal;
}
export declare function getChoices({ http, connectorId, fields, signal }: GetChoicesProps): Promise<import("@kbn/actions-plugin/common").ActionTypeExecutorResult<Choice[]>>;
