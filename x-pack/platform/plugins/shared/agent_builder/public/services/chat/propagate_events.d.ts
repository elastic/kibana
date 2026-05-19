import type { OperatorFunction } from 'rxjs';
import type { ChatEvent } from '@kbn/agent-builder-common';
import type { EventsService } from '../events';
/**
 * Forwards each event in the converse() stream to the public events service, tagged with
 * the conversation id so per-conversation subscribers (`getChatEvents$`) can filter to
 * just their conversation.
 */
export declare function propagateEvents({ eventsService, conversationId, }: {
    eventsService: EventsService;
    conversationId: string;
}): OperatorFunction<ChatEvent, ChatEvent>;
