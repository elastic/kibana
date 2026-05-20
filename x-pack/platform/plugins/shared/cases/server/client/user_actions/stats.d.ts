import type { CaseUserActionStatsResponse } from '../../../common/types/api';
import type { CasesClientArgs } from '..';
import type { UserActionGet } from './types';
import type { CasesClient } from '../client';
export declare const getStats: ({ caseId }: UserActionGet, casesClient: CasesClient, clientArgs: CasesClientArgs) => Promise<CaseUserActionStatsResponse>;
