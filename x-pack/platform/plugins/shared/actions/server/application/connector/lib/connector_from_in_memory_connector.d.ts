import type { ActionTypeRegistry } from '../../../action_type_registry';
import type { InMemoryConnector } from '../../../types';
import type { Connector } from '../types';
export declare function connectorFromInMemoryConnector({ id, inMemoryConnector, actionTypeRegistry, }: {
    id: string;
    inMemoryConnector: InMemoryConnector;
    actionTypeRegistry: ActionTypeRegistry;
}): Connector;
