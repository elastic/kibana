/**
 * Reasoning effort levels accepted by the Elasticsearch unified chat completion API.
 *
 * @see https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-inference-chat-completion-unified
 */
export type ChatCompletionReasoningEffort = 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';
/**
 * Reasoning configuration forwarded to Elasticsearch `_inference/chat_completion`.
 *
 * On OpenAI Chat Completions, newer reasoning models reject function tools unless
 * effort is `none`. Callers (or the Inference adapter) should set `effort: 'none'`
 * when tools are attached until Responses API support lands.
 */
export interface ChatCompletionReasoning {
    /**
     * Hint for how much effort the model should put into reasoning.
     * Prefer `none` when native function tools are present on Chat Completions.
     */
    effort?: ChatCompletionReasoningEffort;
    /**
     * Shortcut to enable reasoning with default (medium) effort.
     * Ignored when `effort` is set.
     */
    enabled?: boolean;
    /**
     * Level of detail for reasoning summaries returned in the response.
     */
    summary?: 'auto' | 'concise' | 'detailed';
    /**
     * When true, reasoning details are omitted from the response.
     */
    exclude?: boolean;
}
