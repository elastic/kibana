import type { CoreSetup } from '@kbn/core/server';
import type { TaskManagerPluginsStart, TaskManagerStartContract } from '../../plugin';
import type { TaskManagerUiamProvisioningRunContext } from '../types';
/**
 * Builds the shared context for a Task Manager UIAM provisioning run
 * (mirrors {@link createProvisioningRunContext} in
 * `alerting/server/provisioning/lib/create_provisioning_run_context.ts`).
 */
export declare const createProvisioningRunContext: (core: CoreSetup<TaskManagerPluginsStart, TaskManagerStartContract>) => Promise<TaskManagerUiamProvisioningRunContext>;
