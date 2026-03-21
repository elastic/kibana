/**
 * Base type for all agentBuilder events
 */
export interface AgentBuilderEvent<TEventType extends string, TData extends Record<string, any>> {
    /**
     * Unique type identifier for the event.
     */
    type: TEventType;
    /**
     * Data bound to this event.
     */
    data: TData;
}
