import type { EventRaw } from '../raw/event_raw';
import type { Agent } from './fields/agent';
export interface Event extends EventRaw {
    agent: Agent;
}
