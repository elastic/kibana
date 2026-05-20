import type { CaseConnectorsRegistry } from './types';
export type * from './types';
interface GetCaseConnectorsReturn {
    caseConnectorsRegistry: CaseConnectorsRegistry;
}
export declare const getCaseConnectors: () => GetCaseConnectorsReturn;
