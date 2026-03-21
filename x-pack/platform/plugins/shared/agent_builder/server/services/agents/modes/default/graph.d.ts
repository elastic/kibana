import type { Logger } from '@kbn/core/server';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import type { ResolvedAgentCapabilities } from '@kbn/agent-builder-common';
import type { AgentEventEmitter } from '@kbn/agent-builder-server';
import type { ToolManager } from '@kbn/agent-builder-server/runner';
import type { ResolvedConfiguration } from '../types';
import type { PromptFactory } from './prompts';
import type { ProcessedConversation } from '../utils/prepare_conversation';
export declare const createAgentGraph: ({ chatModel, toolManager, configuration, capabilities, logger, events, structuredOutput, outputSchema, processedConversation, promptFactory, }: {
    chatModel: InferenceChatModel;
    toolManager: ToolManager;
    capabilities: ResolvedAgentCapabilities;
    configuration: ResolvedConfiguration;
    logger: Logger;
    events: AgentEventEmitter;
    structuredOutput?: boolean;
    outputSchema?: Record<string, unknown>;
    processedConversation: ProcessedConversation;
    promptFactory: PromptFactory;
}) => import("@langchain/langgraph").CompiledStateGraph<{
    cycleLimit: number;
    resumeToStep: string;
    currentCycle: number;
    errorCount: number;
    mainActions: import("./actions").ResearchAgentAction[];
    answerActions: import("./actions").AnswerAgentAction[];
    interrupted: boolean;
    prompt: import("@kbn/agent-builder-common/agents").ConfirmationPrompt;
    finalAnswer: string;
}, {
    cycleLimit?: number | undefined;
    resumeToStep?: string | undefined;
    currentCycle?: number | undefined;
    errorCount?: number | undefined;
    mainActions?: import("./actions").ResearchAgentAction[] | undefined;
    answerActions?: import("./actions").AnswerAgentAction[] | undefined;
    interrupted?: boolean | undefined;
    prompt?: import("@kbn/agent-builder-common/agents").ConfirmationPrompt | undefined;
    finalAnswer?: string | undefined;
}, string, {
    cycleLimit: import("@langchain/langgraph").BinaryOperatorAggregate<number, number>;
    resumeToStep: import("@langchain/langgraph").LastValue<string>;
    currentCycle: import("@langchain/langgraph").BinaryOperatorAggregate<number, number>;
    errorCount: import("@langchain/langgraph").BinaryOperatorAggregate<number, number>;
    mainActions: import("@langchain/langgraph").BinaryOperatorAggregate<import("./actions").ResearchAgentAction[], import("./actions").ResearchAgentAction[]>;
    answerActions: import("@langchain/langgraph").BinaryOperatorAggregate<import("./actions").AnswerAgentAction[], import("./actions").AnswerAgentAction[]>;
    interrupted: import("@langchain/langgraph").LastValue<boolean>;
    prompt: import("@langchain/langgraph").LastValue<import("@kbn/agent-builder-common/agents").ConfirmationPrompt>;
    finalAnswer: import("@langchain/langgraph").LastValue<string>;
}, {
    cycleLimit: import("@langchain/langgraph").BinaryOperatorAggregate<number, number>;
    resumeToStep: import("@langchain/langgraph").LastValue<string>;
    currentCycle: import("@langchain/langgraph").BinaryOperatorAggregate<number, number>;
    errorCount: import("@langchain/langgraph").BinaryOperatorAggregate<number, number>;
    mainActions: import("@langchain/langgraph").BinaryOperatorAggregate<import("./actions").ResearchAgentAction[], import("./actions").ResearchAgentAction[]>;
    answerActions: import("@langchain/langgraph").BinaryOperatorAggregate<import("./actions").AnswerAgentAction[], import("./actions").AnswerAgentAction[]>;
    interrupted: import("@langchain/langgraph").LastValue<boolean>;
    prompt: import("@langchain/langgraph").LastValue<import("@kbn/agent-builder-common/agents").ConfirmationPrompt>;
    finalAnswer: import("@langchain/langgraph").LastValue<string>;
}, import("@langchain/langgraph").StateDefinition, {
    [x: string]: ({
        mainActions: (import("./actions").AgentErrorAction | import("./actions").ToolCallAction | import("./actions").HandoverAction)[];
        currentCycle: number;
        errorCount: number;
    } & {
        mainActions: (import("./actions").ExecuteToolAction | import("./actions").ToolPromptAction)[];
    } & {
        interrupted: boolean;
        prompt: import("@kbn/agent-builder-common/agents").ConfirmationPrompt;
    } & {
        mainActions: import("./actions").HandoverAction[];
    } & {
        answerActions: (import("./actions").AgentErrorAction | import("./actions").AnswerAction | import("./actions").StructuredAnswerAction)[];
        errorCount: number;
    } & import("@langchain/langgraph").UpdateType<{
        cycleLimit: import("@langchain/langgraph").BinaryOperatorAggregate<number, number>;
        resumeToStep: import("@langchain/langgraph").LastValue<string>;
        currentCycle: import("@langchain/langgraph").BinaryOperatorAggregate<number, number>;
        errorCount: import("@langchain/langgraph").BinaryOperatorAggregate<number, number>;
        mainActions: import("@langchain/langgraph").BinaryOperatorAggregate<import("./actions").ResearchAgentAction[], import("./actions").ResearchAgentAction[]>;
        answerActions: import("@langchain/langgraph").BinaryOperatorAggregate<import("./actions").AnswerAgentAction[], import("./actions").AnswerAgentAction[]>;
        interrupted: import("@langchain/langgraph").LastValue<boolean>;
        prompt: import("@langchain/langgraph").LastValue<import("@kbn/agent-builder-common/agents").ConfirmationPrompt>;
        finalAnswer: import("@langchain/langgraph").LastValue<string>;
    }>) | ({
        mainActions: import("./actions").AgentErrorAction[];
        errorCount: number;
        currentCycle?: undefined;
    } & {
        mainActions: (import("./actions").ExecuteToolAction | import("./actions").ToolPromptAction)[];
    } & {
        interrupted: boolean;
        prompt: import("@kbn/agent-builder-common/agents").ConfirmationPrompt;
    } & {
        mainActions: import("./actions").HandoverAction[];
    } & {
        answerActions: (import("./actions").AgentErrorAction | import("./actions").AnswerAction | import("./actions").StructuredAnswerAction)[];
        errorCount: number;
    } & import("@langchain/langgraph").UpdateType<{
        cycleLimit: import("@langchain/langgraph").BinaryOperatorAggregate<number, number>;
        resumeToStep: import("@langchain/langgraph").LastValue<string>;
        currentCycle: import("@langchain/langgraph").BinaryOperatorAggregate<number, number>;
        errorCount: import("@langchain/langgraph").BinaryOperatorAggregate<number, number>;
        mainActions: import("@langchain/langgraph").BinaryOperatorAggregate<import("./actions").ResearchAgentAction[], import("./actions").ResearchAgentAction[]>;
        answerActions: import("@langchain/langgraph").BinaryOperatorAggregate<import("./actions").AnswerAgentAction[], import("./actions").AnswerAgentAction[]>;
        interrupted: import("@langchain/langgraph").LastValue<boolean>;
        prompt: import("@langchain/langgraph").LastValue<import("@kbn/agent-builder-common/agents").ConfirmationPrompt>;
        finalAnswer: import("@langchain/langgraph").LastValue<string>;
    }>);
}>;
