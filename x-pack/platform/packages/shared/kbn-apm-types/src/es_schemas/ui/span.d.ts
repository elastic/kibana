import type { SpanRaw } from '../raw/span_raw';
import type { Agent } from './fields/agent';
export interface Span extends SpanRaw {
    agent: Agent;
}
