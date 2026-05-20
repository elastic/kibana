import type { UserActionFindResponse } from '../../../common/types/api';
import type { CasesClientArgs } from '../types';
import type { UserActionFind } from './types';
import type { CasesClient } from '../client';
export declare const find: ({ caseId, params }: UserActionFind, casesClient: CasesClient, clientArgs: CasesClientArgs) => Promise<UserActionFindResponse>;
