import type { SavedObjectAttributes } from '@kbn/core/server';
import type { ActionsClientContext } from '../../../../../actions_client';
export interface ConnectorCreate {
    actionTypeId: string;
    name: string;
    config: SavedObjectAttributes;
    secrets: SavedObjectAttributes;
}
export interface ConnectorCreateParams {
    context: ActionsClientContext;
    action: ConnectorCreate;
    options?: {
        id?: string;
    };
}
