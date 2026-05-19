import type { Logger } from '@kbn/core/server';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import type { CasesEventBus } from '../../events/event_bus';
/**
 * Registers bridge listeners that forward Cases domain events to workflows_extensions.
 */
export declare function registerCasesWorkflowEventBridge(casesEventBus: CasesEventBus, workflowsExtensions: WorkflowsExtensionsServerPluginStart | undefined, logger: Logger): void;
