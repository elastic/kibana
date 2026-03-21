import type { Span } from '@opentelemetry/api';
import type { AgentDefinition } from '@kbn/agent-builder-common';
import type { AgentHandlerReturn } from '@kbn/agent-builder-server';
interface WithAgentSpanOptions {
    agent: AgentDefinition;
}
export declare function withAgentSpan({ agent }: WithAgentSpanOptions, cb: (span?: Span) => Promise<AgentHandlerReturn>): Promise<AgentHandlerReturn>;
export {};
