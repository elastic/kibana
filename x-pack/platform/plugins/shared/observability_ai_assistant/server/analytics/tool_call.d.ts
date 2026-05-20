import type { EventTypeOpts } from '@kbn/core/server';
import { type Connector, type Scope } from '../../common/analytics';
export interface ToolCallEvent extends Connector, Scope {
    toolName: string;
}
export declare const toolCallEventType = "observability_ai_assistant_tool_call";
export declare const toolCallEvent: EventTypeOpts<ToolCallEvent>;
