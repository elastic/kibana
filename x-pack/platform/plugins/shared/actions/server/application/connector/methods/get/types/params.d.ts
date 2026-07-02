import type { ActionsClientContext } from '../../../../../actions_client';
export interface GetParams {
    context: ActionsClientContext;
    id: string;
    throwIfSystemAction?: boolean;
}
