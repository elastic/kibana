import type { AgentName } from '../es_schemas_ui';
export interface SpanLinkDetails {
    traceId: string;
    spanId: string;
    details?: {
        agentName: AgentName;
        serviceName: string;
        duration: number;
        environment: string;
        transactionId?: string;
        spanName?: string;
        spanSubtype?: string;
        spanType?: string;
    };
}
export interface SpanLinks {
    outgoingSpanLinks: SpanLinkDetails[];
    incomingSpanLinks: SpanLinkDetails[];
}
