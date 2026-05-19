import type { ConnectorMappingResponse } from '../../../common/types/api';
import type { CasesClientArgs } from '..';
import type { MappingsArgs } from './types';
export declare const getMappings: ({ connector }: MappingsArgs, clientArgs: CasesClientArgs) => Promise<ConnectorMappingResponse | null>;
