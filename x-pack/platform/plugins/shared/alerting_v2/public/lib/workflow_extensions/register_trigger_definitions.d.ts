import type { WorkflowsExtensionsPublicPluginSetup } from '@kbn/workflows-extensions/public';
/**
 * Registers all alerting-v2 public workflow trigger definitions (UI metadata).
 * Call once during plugin setup with the `workflowsExtensions` setup contract.
 */
export declare function registerTriggerDefinitions(workflowsExtensions: WorkflowsExtensionsPublicPluginSetup): void;
