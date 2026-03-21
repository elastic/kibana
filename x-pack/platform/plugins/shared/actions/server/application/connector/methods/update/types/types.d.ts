import type { SavedObjectAttributes } from '@kbn/core/server';
import type { ActionsClientContext } from '../../../../../actions_client';
export interface ConnectorUpdate {
    name: string;
    config: SavedObjectAttributes;
    secrets: SavedObjectAttributes;
}
export interface ConnectorUpdateParams {
    context: ActionsClientContext;
    id: string;
    action: ConnectorUpdate;
}
