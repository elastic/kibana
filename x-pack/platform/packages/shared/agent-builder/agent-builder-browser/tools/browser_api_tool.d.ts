import type { BrowserApiToolMetadata } from '@kbn/agent-builder-common';
import { type ZodType } from '@kbn/zod/v4';
/**
 * Definition of a browser API tool that can be provided by consumers
 * and executed in the browser when requested by the LLM.
 */
export interface BrowserApiToolDefinition<TParams = unknown> {
    /**
     * Unique identifier for the tool.
     * Must use underscores (not dots) to comply with OpenAI API requirements.
     * Should follow naming convention: consumer_domain_action
     * Example: 'set_time_range', 'update_filters'
     *
     * NOTE: Dots are NOT allowed in tool IDs as they don't match the OpenAI
     * API tool name pattern ^[a-zA-Z0-9_-]+$
     */
    id: string;
    /**
     * Description of what the tool does. This is provided to the LLM
     * to help it understand when and how to use the tool.
     */
    description: string;
    /**
     * Zod schema defining the tool's parameters.
     * Use .describe() on each field to provide parameter descriptions for the LLM.
     */
    schema: ZodType<TParams>;
    /**
     * Handler function that executes when the tool is called.
     * This function runs in the browser and receives validated parameters.
     * Results are NOT returned to the LLM (one-way communication).
     */
    handler: (params: TParams) => void | Promise<void>;
}
export declare function toToolMetadata<TParams>(tool: BrowserApiToolDefinition<TParams>): BrowserApiToolMetadata;
