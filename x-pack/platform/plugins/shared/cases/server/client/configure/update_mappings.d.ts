import type { ConnectorMappingResponse } from '../../../common/types/api';
import type { CasesClientArgs } from '..';
import type { UpdateMappingsArgs } from './types';
export declare const updateMappings: ({ connector, mappingId, refresh }: UpdateMappingsArgs, clientArgs: CasesClientArgs) => Promise<ConnectorMappingResponse>;
