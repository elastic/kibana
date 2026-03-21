import type { Span } from '@opentelemetry/api';
import type { Observable } from 'rxjs';
import type { ChatEvent } from '@kbn/agent-builder-common';
interface WithConverseSpanOptions {
    agentId: string;
    conversationId: string | undefined;
}
export declare function withConverseSpan({ agentId, conversationId }: WithConverseSpanOptions, cb: (span?: Span) => Observable<ChatEvent>): Observable<ChatEvent>;
export {};
