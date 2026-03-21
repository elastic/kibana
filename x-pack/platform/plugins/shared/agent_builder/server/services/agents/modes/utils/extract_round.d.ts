import type { Observable } from 'rxjs';
import type { ChatAgentEvent } from '@kbn/agent-builder-common';
export declare const extractRound: (events$: Observable<ChatAgentEvent>) => Promise<import("@kbn/agent-builder-common").ConversationRound>;
