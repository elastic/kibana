import type { WorkflowsExtensionsPublicPluginSetup } from '@kbn/workflows-extensions/public';
/**
 * Registers all alerting-v2 public workflow trigger definitions (UI metadata).
 * Call once during plugin setup with the `workflowsExtensions` setup contract.
 *
 * Each definition is registered as a loader so its module (and the EUI icon it
 * lazily imports) stays out of the plugin's page-load bundle and is only fetched
 * when the Workflows editor needs it.
 */
export declare function registerTriggerDefinitions(workflowsExtensions: WorkflowsExtensionsPublicPluginSetup): void;
