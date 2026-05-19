import type { KibanaRequest } from '@kbn/core/server';
import type { CasesServerSetupDependencies } from '../types';
import type { CasesClient } from '../client';
export declare function registerCaseWorkflowSteps(workflowsExtensions: CasesServerSetupDependencies['workflowsExtensions'], getCasesClient: (request: KibanaRequest) => Promise<CasesClient>): void;
