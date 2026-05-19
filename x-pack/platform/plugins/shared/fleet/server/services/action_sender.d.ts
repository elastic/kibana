import type { Logger } from '@kbn/core/server';
import type { TelemetryEventsSender } from '../telemetry/sender';
import type { AgentActionType } from '../types';
export interface AgentActionEvent {
    eventType: AgentActionType;
    agentCount: number;
    sourceType?: 'serverless' | 'ech';
    targetType?: 'serverless' | 'ech';
}
export declare const FLEET_ACTIONS_CHANNEL_NAME = "fleet-actions";
export declare function sendActionTelemetryEvents(logger: Logger, eventsTelemetry: TelemetryEventsSender | undefined, actionEvent: AgentActionEvent): void;
