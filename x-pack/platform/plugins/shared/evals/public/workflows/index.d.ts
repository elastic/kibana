import type { WorkflowsExtensionsPublicPluginSetup } from '@kbn/workflows-extensions/public';
/**
 * Registers the `ai.evals.*` step definitions that give the Workflows YAML editor
 * autocomplete/validation. Called synchronously from `setup()` so the loaders are
 * queued before the editor reads the registry.
 */
export declare const registerEvalsPublicWorkflowSteps: (workflowsExtensions: WorkflowsExtensionsPublicPluginSetup) => void;
