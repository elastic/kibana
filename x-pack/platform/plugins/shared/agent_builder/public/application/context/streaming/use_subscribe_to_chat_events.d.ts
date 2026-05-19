import type { ChatEvent } from '@kbn/agent-builder-common';
import { type Observable } from 'rxjs';
import type { BrowserApiToolDefinition } from '@kbn/agent-builder-browser/tools/browser_api_tool';
import type { ConversationActions } from '../conversation/use_conversation_actions';
import type { BrowserToolExecutor } from '../../services/browser_tool_executor';
interface SubscribeOptions {
    events$: Observable<ChatEvent>;
    conversationActions: ConversationActions;
    browserApiTools?: Array<BrowserApiToolDefinition<any>>;
    browserToolExecutor?: BrowserToolExecutor;
    isAborted: () => boolean;
    setAgentReasoning: (agentReasoning: string) => void;
}
/**
 * Subscribe to a chat event stream and dispatch every event to the conversation cache via
 * `conversationActions`. Returns a Promise that resolves when the stream completes (success
 * or abort) and rejects on a real error.
 *
 * Plain function (not a hook) so mutation `mutationFn` can call it inline. Takes
 * `conversationActions` as a parameter rather than reading from React context — each mutation
 * builds its own actions targeting the mutation-owned conversation id, so events keep writing
 * to the right cache regardless of where the user has navigated.
 */
export declare const subscribeToChatEvents: ({ events$, conversationActions, browserApiTools, browserToolExecutor, isAborted, setAgentReasoning, }: SubscribeOptions) => Promise<void>;
export {};
