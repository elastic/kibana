import type { AgentActionEvent } from '../services/action_sender';
import type { PackageUpdateEvent } from '../services/upgrade_sender';
export interface FleetTelemetryChannelEvents {
    'fleet-upgrades': PackageUpdateEvent;
    'fleet-actions': AgentActionEvent;
}
export type FleetTelemetryChannel = keyof FleetTelemetryChannelEvents;
