import type { RawAction, InMemoryConnector } from '../../../types';
export type ConnectorWithOptionalDeprecation = Omit<InMemoryConnector, 'isDeprecated' | 'isConnectorTypeDeprecated'> & Pick<Partial<InMemoryConnector>, 'isDeprecated' | 'isConnectorTypeDeprecated'>;
export declare const isConnectorDeprecated: (connector: RawAction | ConnectorWithOptionalDeprecation) => boolean;
