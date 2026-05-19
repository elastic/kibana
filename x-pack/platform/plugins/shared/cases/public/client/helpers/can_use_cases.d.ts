import type { ApplicationStart } from '@kbn/core/public';
import { GENERAL_CASES_OWNER, OBSERVABILITY_OWNER, SECURITY_SOLUTION_OWNER } from '../../../common/constants';
import type { CasesPermissions } from '../../../common';
export type CasesOwners = typeof SECURITY_SOLUTION_OWNER | typeof OBSERVABILITY_OWNER | typeof GENERAL_CASES_OWNER;
export declare const canUseCases: (capabilities: Partial<ApplicationStart["capabilities"]>) => (owners?: CasesOwners[]) => CasesPermissions;
