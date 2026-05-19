import type { GetCaseConnectorsResponse } from '../../../common/types/api';
import type { CasesClientArgs } from '..';
import type { GetConnectorsRequest } from './types';
export declare const getConnectors: ({ caseId }: GetConnectorsRequest, clientArgs: CasesClientArgs) => Promise<GetCaseConnectorsResponse>;
