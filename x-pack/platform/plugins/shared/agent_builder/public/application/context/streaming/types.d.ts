import type { ConversationRoundStep } from '@kbn/agent-builder-common';
export type StreamType = 'send' | 'regenerate' | 'resume';
export interface ActiveStream {
    type: StreamType;
    agentReasoning: string | null;
}
export interface StreamRecord {
    pendingMessage?: string;
    error?: unknown;
    errorSteps: ConversationRoundStep[];
}
