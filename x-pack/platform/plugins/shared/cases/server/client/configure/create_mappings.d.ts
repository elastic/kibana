import type { ConnectorMappingResponse } from '../../../common/types/api';
import type { CasesClientArgs } from '..';
import type { CreateMappingsArgs } from './types';
export declare const createMappings: ({ connector, owner, refresh }: CreateMappingsArgs, clientArgs: CasesClientArgs) => Promise<ConnectorMappingResponse>;
