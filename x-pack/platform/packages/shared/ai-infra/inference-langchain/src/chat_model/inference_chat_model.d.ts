import { BaseChatModel, type BaseChatModelParams, type BaseChatModelCallOptions, type BindToolsInput, type LangSmithParams } from '@langchain/core/language_models/chat_models';
import type { InteropZodType } from '@langchain/core/utils/types';
import type { BaseLanguageModelInput, StructuredOutputMethodOptions } from '@langchain/core/language_models/base';
import type { BaseMessage, AIMessageChunk } from '@langchain/core/messages';
import type { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager';
import type { ChatResult } from '@langchain/core/outputs';
import { ChatGenerationChunk } from '@langchain/core/outputs';
import type { Runnable } from '@langchain/core/runnables';
import type { InferenceConnector, ChatCompleteAPI, ChatCompleteOptions, FunctionCallingMode, ConnectorTelemetryMetadata, ChatCompleteResponse } from '@kbn/inference-common';
import type { ToolChoice } from './types';
export interface InferenceChatModelParams extends BaseChatModelParams {
    connector: InferenceConnector;
    chatComplete: ChatCompleteAPI;
    functionCallingMode?: FunctionCallingMode;
    temperature?: number;
    model?: string;
    signal?: AbortSignal;
    timeout?: number;
    telemetryMetadata?: ConnectorTelemetryMetadata;
}
export interface InferenceChatModelCallOptions extends BaseChatModelCallOptions {
    functionCallingMode?: FunctionCallingMode;
    tools?: BindToolsInput[];
    tool_choice?: ToolChoice;
    temperature?: number;
    model?: string;
    timeout?: number;
}
type InvocationParams = Omit<ChatCompleteOptions, 'messages' | 'system' | 'stream'>;
/**
 * Langchain chatModel utilizing the inference API under the hood for communication with the LLM.
 *
 * @example
 * ```ts
 * const chatModel = new InferenceChatModel({
 *    chatComplete: inference.chatComplete,
 *    connector: someConnector,
 *    logger: myPluginLogger
 * });
 *
 * // just use it as another langchain chatModel
 * ```
 */
export declare class InferenceChatModel extends BaseChatModel<InferenceChatModelCallOptions> {
    private readonly chatComplete;
    private readonly connector;
    private readonly logger;
    private readonly telemetryMetadata?;
    protected temperature?: number;
    protected functionCallingMode?: FunctionCallingMode;
    protected maxRetries?: number;
    protected model?: string;
    protected signal?: AbortSignal;
    protected timeout?: number;
    constructor(args: InferenceChatModelParams);
    static lc_name(): string;
    get callKeys(): string[];
    getConnector(): InferenceConnector;
    _llmType(): string;
    _modelType(): string;
    _identifyingParams(): {
        metadata?: import("@kbn/inference-common").ChatCompleteMetadata | undefined;
        timeout?: number | undefined;
        toolChoice?: import("@kbn/inference-common").ToolChoice<string> | undefined;
        tools?: import("@kbn/inference-common/src/chat_complete/tools").ToolDefinitions | undefined;
        connectorId: string;
        temperature?: number | undefined;
        modelName?: string | undefined;
        functionCalling?: FunctionCallingMode | undefined;
        abortSignal?: AbortSignal | undefined;
        maxRetries?: number | undefined;
        retryConfiguration?: import("@kbn/inference-common").ChatCompleteRetryConfiguration | undefined;
        model_name: string | undefined;
    };
    identifyingParams(): {
        metadata?: import("@kbn/inference-common").ChatCompleteMetadata | undefined;
        timeout?: number | undefined;
        toolChoice?: import("@kbn/inference-common").ToolChoice<string> | undefined;
        tools?: import("@kbn/inference-common/src/chat_complete/tools").ToolDefinitions | undefined;
        connectorId: string;
        temperature?: number | undefined;
        modelName?: string | undefined;
        functionCalling?: FunctionCallingMode | undefined;
        abortSignal?: AbortSignal | undefined;
        maxRetries?: number | undefined;
        retryConfiguration?: import("@kbn/inference-common").ChatCompleteRetryConfiguration | undefined;
        model_name: string | undefined;
    };
    getLsParams(options: this['ParsedCallOptions']): LangSmithParams;
    bindTools(tools: BindToolsInput[], kwargs?: Partial<InferenceChatModelCallOptions>): Runnable<BaseLanguageModelInput, AIMessageChunk<import("@langchain/core/messages").MessageStructure<import("@langchain/core/messages").MessageToolSet>>, InferenceChatModelCallOptions>;
    invocationParams(options: this['ParsedCallOptions']): InvocationParams;
    completionWithRetry: <TStream extends boolean | undefined = false>(request: ChatCompleteOptions & {
        stream?: TStream;
    }) => Promise<Awaited<true extends (boolean & TStream) | undefined ? import("@kbn/inference-common").ChatCompleteStreamResponse<import("utility-types").Overwrite<import("@kbn/inference-common/src/chat_complete/api").DefaultChatCompleteOptions, {
        connectorId: string;
        system?: string;
        messages: import("@kbn/inference-common").Message[];
        temperature?: number;
        modelName?: string;
        functionCalling?: FunctionCallingMode;
        abortSignal?: AbortSignal;
        metadata?: import("@kbn/inference-common").ChatCompleteMetadata;
        maxRetries?: number;
        retryConfiguration?: import("@kbn/inference-common").ChatCompleteRetryConfiguration;
        stream?: boolean;
        timeout?: number;
    } & import("@kbn/inference-common").ToolOptions<import("@kbn/inference-common/src/chat_complete/tools").ToolDefinitions, import("@kbn/inference-common").ToolChoice<string>> & {
        stream?: TStream;
    }>> : never> | Awaited<false extends (boolean & TStream) | undefined ? Promise<ChatCompleteResponse<import("utility-types").Overwrite<import("@kbn/inference-common/src/chat_complete/api").DefaultChatCompleteOptions, {
        connectorId: string;
        system?: string;
        messages: import("@kbn/inference-common").Message[];
        temperature?: number;
        modelName?: string;
        functionCalling?: FunctionCallingMode;
        abortSignal?: AbortSignal;
        metadata?: import("@kbn/inference-common").ChatCompleteMetadata;
        maxRetries?: number;
        retryConfiguration?: import("@kbn/inference-common").ChatCompleteRetryConfiguration;
        stream?: boolean;
        timeout?: number;
    } & import("@kbn/inference-common").ToolOptions<import("@kbn/inference-common/src/chat_complete/tools").ToolDefinitions, import("@kbn/inference-common").ToolChoice<string>> & {
        stream?: TStream;
    }>>> : never>>;
    _generate(baseMessages: BaseMessage[], options: this['ParsedCallOptions'], runManager?: CallbackManagerForLLMRun): Promise<ChatResult>;
    _streamResponseChunks(baseMessages: BaseMessage[], options: this['ParsedCallOptions'], runManager?: CallbackManagerForLLMRun): AsyncGenerator<ChatGenerationChunk>;
    withStructuredOutput<RunOutput extends Record<string, any> = Record<string, any>>(outputSchema: InteropZodType<RunOutput> | Record<string, any>, config?: StructuredOutputMethodOptions<false>): Runnable<BaseLanguageModelInput, RunOutput>;
    withStructuredOutput<RunOutput extends Record<string, any> = Record<string, any>>(outputSchema: InteropZodType<RunOutput> | Record<string, any>, config?: StructuredOutputMethodOptions<true>): Runnable<BaseLanguageModelInput, {
        raw: BaseMessage;
        parsed: RunOutput;
    }>;
    _combineLLMOutput(): {};
}
export {};
