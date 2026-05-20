import type { StateContext } from '../../../../../common/types';
export interface State {
    onTransition: any;
    nextState?: string;
    currentStatus?: string;
    onPreTransition?: any;
    onPostTransition?: any;
    isAsync?: boolean;
}
export type StatusName = 'success' | 'failed' | 'pending';
export type StateMachineStates<T extends string> = Record<T, State>;
export interface StateMachineDefinition<T extends string> {
    context: StateContext<string>;
    states: StateMachineStates<T>;
}
export declare function handleState(currentStateName: string, definition: StateMachineDefinition<string>, context: StateContext<string>): Promise<StateContext<string>>;
