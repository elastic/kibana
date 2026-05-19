import type { GetCaseUsersResponse } from '../../../common/types/api';
import type { CasesClient } from '../client';
import type { CasesClientArgs } from '../types';
import type { GetUsersRequest } from './types';
export declare const getUsers: ({ caseId }: GetUsersRequest, casesClient: CasesClient, clientArgs: CasesClientArgs) => Promise<GetCaseUsersResponse>;
