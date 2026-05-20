import type { CaseUserActionsDeprecatedResponse } from '../../../common/types/api';
import type { CasesClientArgs } from '..';
import type { UserActionGet } from './types';
export declare const get: ({ caseId }: UserActionGet, clientArgs: CasesClientArgs) => Promise<CaseUserActionsDeprecatedResponse>;
