import type { ErrorRaw } from '../raw/error_raw';
import type { Agent } from './fields/agent';
export interface APMError extends ErrorRaw {
    agent: Agent;
}
