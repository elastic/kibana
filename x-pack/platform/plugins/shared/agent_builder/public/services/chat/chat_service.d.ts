import type { Observable } from 'rxjs';
import type { HttpSetup } from '@kbn/core-http-browser';
import type { ChatEvent, AgentCapabilities } from '@kbn/agent-builder-common';
import { type PromptResponse } from '@kbn/agent-builder-common/agents';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import type { BrowserApiToolMetadata } from '@kbn/agent-builder-common';
import type { EventsService } from '../events';
interface BaseConverseParams {
    signal?: AbortSignal;
    agentId?: string;
    connectorId?: string;
    conversationId: string;
    browserApiTools?: BrowserApiToolMetadata[];
    capabilities?: AgentCapabilities;
}
export type ChatParams = BaseConverseParams & {
    input: string;
    attachments?: AttachmentInput[];
};
export type ResumeRoundParams = BaseConverseParams & {
    prompts: Record<string, PromptResponse>;
};
export type RegenerateParams = BaseConverseParams;
export declare class ChatService {
    private readonly http;
    private readonly events;
    constructor({ http, events }: {
        http: HttpSetup;
        events: EventsService;
    });
    chat(params: ChatParams): Observable<ChatEvent>;
    /**
     * Resume a round that is awaiting a prompt response (e.g., confirmation).
     */
    resume(params: ResumeRoundParams): Observable<ChatEvent>;
    regenerate(params: RegenerateParams): Observable<ChatEvent>;
    followExecution(executionId: string, signal?: AbortSignal): Observable<ChatEvent>;
    private converse;
}
export {};
