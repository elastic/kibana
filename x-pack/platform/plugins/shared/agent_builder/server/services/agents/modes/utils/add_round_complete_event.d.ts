import type { OperatorFunction } from 'rxjs';
import type { RoundCompleteEvent, RoundInput, ConversationRound, RuntimeAgentConfigurationOverrides } from '@kbn/agent-builder-common';
import type { ConversationInternalState } from '@kbn/agent-builder-common/chat';
import type { ConversationStateManager, ModelProvider } from '@kbn/agent-builder-server/runner';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import type { ConvertedEvents } from '../default/convert_graph_events';
type SourceEvents = ConvertedEvents;
export declare const addRoundCompleteEvent: ({ pendingRound, userInput, startTime, endTime, getConversationState, modelProvider, stateManager, attachmentStateManager, configurationOverrides, }: {
    pendingRound: ConversationRound | undefined;
    userInput: RoundInput;
    startTime: Date;
    modelProvider: ModelProvider;
    stateManager: ConversationStateManager;
    getConversationState: () => ConversationInternalState;
    attachmentStateManager: AttachmentStateManager;
    endTime?: Date;
    configurationOverrides?: RuntimeAgentConfigurationOverrides;
}) => OperatorFunction<SourceEvents, SourceEvents | RoundCompleteEvent>;
export {};
