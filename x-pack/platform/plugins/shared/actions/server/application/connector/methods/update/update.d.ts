import type { Connector } from '../../types';
import type { ConnectorUpdateParams } from './types';
export declare function update({ context, id, action }: ConnectorUpdateParams): Promise<Connector>;
