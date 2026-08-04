import type { Connector } from '../../types';
import type { GetParams } from './types';
export declare function get({ context, id, throwIfSystemAction, }: GetParams): Promise<Connector>;
