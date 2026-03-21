import type { StreamEvent as LangchainStreamEvent } from '@langchain/core/tracers/log_stream';
import type { OperatorFunction } from 'rxjs';
import type { ChatAgentEvent, ConversationRound } from '@kbn/agent-builder-common/chat';
import type { Logger } from '@kbn/logging';
import type { RunToolReturn } from '@kbn/agent-builder-server';
import type { ToolManager } from '@kbn/agent-builder-server/runner';
import type { ToolCallResult } from './actions';
import type { InternalEvent } from './events';
export type ConvertedEvents = ChatAgentEvent | InternalEvent;
export declare const convertGraphEvents: ({ graphName, toolManager, pendingRound, logger, startTime, }: {
    graphName: string;
    toolManager: ToolManager;
    pendingRound: ConversationRound | undefined;
    logger: Logger;
    startTime: Date;
}) => OperatorFunction<LangchainStreamEvent, ConvertedEvents>;
export declare const extractToolReturn: (message: ToolCallResult) => RunToolReturn;
