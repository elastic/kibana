import type { AgentBuilderEvent } from '@kbn/agent-builder-common';
import type { StateType } from './state';
export declare enum AgentExecutionEventType {
    finalState = "final_state"
}
export interface FinalStateEventData {
    state: StateType;
}
export type FinalStateEvent = AgentBuilderEvent<AgentExecutionEventType.finalState, FinalStateEventData>;
export declare const isFinalStateEvent: (event: AgentBuilderEvent<any, any>) => event is FinalStateEvent;
export declare const createFinalStateEvent: (state: StateType) => FinalStateEvent;
export type InternalEvent = FinalStateEvent;
export declare const isInternalEvent: (event: AgentBuilderEvent<any, any>) => event is InternalEvent;
