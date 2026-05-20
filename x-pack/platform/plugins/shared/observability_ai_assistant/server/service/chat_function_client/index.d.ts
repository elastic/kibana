import type { Logger } from '@kbn/logging';
import { type FunctionResponse } from '../../../common/functions/types';
import type { Message, ObservabilityAIAssistantScreenContextRequest } from '../../../common/types';
import type { FunctionCallChatFunction, FunctionHandler, InstructionOrCallback, RegisterFunction, RegisterInstruction } from '../types';
export declare class ChatFunctionClient {
    private readonly screenContexts;
    private readonly instructions;
    private readonly functionRegistry;
    private readonly validators;
    private readonly actions;
    constructor(screenContexts: ObservabilityAIAssistantScreenContextRequest[]);
    registerFunction: RegisterFunction;
    registerInstruction: RegisterInstruction;
    validate(name: string, parameters: unknown): void;
    getInstructions(): InstructionOrCallback[];
    hasAction(name: string): boolean;
    getFunctions({ filter, }?: {
        filter?: string;
    }): FunctionHandler[];
    getActions(): Required<ObservabilityAIAssistantScreenContextRequest>['actions'];
    hasFunction(name: string): boolean;
    executeFunction({ chat, name, args, messages, signal, logger, connectorId, simulateFunctionCalling, }: {
        chat: FunctionCallChatFunction;
        name: string;
        args: string | undefined;
        messages: Message[];
        signal: AbortSignal;
        logger: Logger;
        connectorId: string;
        simulateFunctionCalling: boolean;
    }): Promise<FunctionResponse>;
}
