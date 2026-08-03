import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { ProductDocBaseStartContract } from '@kbn/product-doc-base-plugin/server';
import type { ResourceType } from '@kbn/product-doc-common';
import type { RetrieveDocumentationAPI } from './tasks/retrieve_documentation';
export interface PluginSetupDependencies {
}
export interface PluginStartDependencies {
    inference: InferenceServerStart;
    productDocBase: ProductDocBaseStartContract;
}
/**
 * Describes public llmTasks plugin contract returned at the `setup` stage.
 */
export interface LlmTasksPluginSetup {
}
/**
 * Describes public llmTasks plugin contract returned at the `start` stage.
 */
export interface LlmTasksPluginStart {
    /**
     * Checks if all prerequisites to use the `retrieveDocumentation` task
     * are respected. Can be used to check if the task can be registered
     * as LLM tool for example.
     */
    retrieveDocumentationAvailable: (options: {
        inferenceId: string;
        resourceType?: ResourceType;
    }) => Promise<boolean>;
    /**
     * Perform the `retrieveDocumentation` task.
     *
     * @see RetrieveDocumentationAPI
     */
    retrieveDocumentation: RetrieveDocumentationAPI;
}
