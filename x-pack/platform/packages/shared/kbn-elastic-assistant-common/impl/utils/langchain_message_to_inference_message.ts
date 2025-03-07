import { BaseMessage as LangChainBaseMessage, AIMessage as LangChainAIMessage, ToolMessage as LangChainToolMessage } from '@langchain/core/messages';
import { AssistantMessage as InferenceAssistantMessage, Message as InferenceMessage, MessageRole, ToolCall, ToolMessage, UserMessage } from '@kbn/inference-common';
import { isEmpty } from 'lodash';

export const langchainMessageToInferenceMessage = (langChainMessage: LangChainBaseMessage): InferenceMessage => {
    switch (langChainMessage.getType()) {
        case "system":
        case "generic":
        case "developer":
        case "human": {
            return {
                role: MessageRole.User,
                content: langChainMessage.content
            } as UserMessage
        }
        case "ai": {
            if (langChainMessage instanceof LangChainAIMessage) {
                const toolCalls: ToolCall[] | undefined = langChainMessage.tool_calls?.map((toolCall): ToolCall => ({
                    toolCallId: toolCall.id as string,
                    function: {
                        ...(!isEmpty(toolCall.args) ? { arguments: toolCall.args } : {}),
                        name: toolCall.name
                    }
                }))
                return {
                    role: MessageRole.Assistant,
                    content: langChainMessage.content as string,
                    ...(!isEmpty(toolCalls) ? { toolCalls } : {})
                } as InferenceAssistantMessage
            }
            throw new Error(`Unable to convert LangChain message of type ${langChainMessage.getType()} to Inference message`)
        }
        case "tool": {
            if (langChainMessage instanceof LangChainToolMessage) {
                return {
                    name: langChainMessage.name,
                    toolCallId: langChainMessage.tool_call_id,
                    role: MessageRole.Tool,
                    response: langChainMessage.content,
                } as ToolMessage
            }
            throw new Error(`Unable to convert LangChain message of type ${langChainMessage.getType()} to Inference message`)
        }
        default: {
            throw new Error(`Unable to convert LangChain message of type ${langChainMessage.getType()} to Inference message`)
        }
    }
}