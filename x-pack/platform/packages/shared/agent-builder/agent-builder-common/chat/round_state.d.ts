export interface RoundState {
    version: number;
    agent: AgentState;
}
export interface AgentState {
    current_cycle: number;
    error_count: number;
    nodes: AgentNodeState[];
}
export interface ExecuteToolNodeState {
    step: 'execute_tool';
    tool_call_id: string;
    tool_id: string;
    tool_params: Record<string, unknown>;
    tool_state: unknown | undefined;
}
/** All possible node states */
export type AgentNodeState = ExecuteToolNodeState;
