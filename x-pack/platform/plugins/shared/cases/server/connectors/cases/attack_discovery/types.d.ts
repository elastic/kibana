import type { TypeOf } from '@kbn/config-schema';
import type { AttackDiscoveryExpandedAlertSchema, AttackDiscoveryExpandedAlertsSchema } from './schema';
export type AttackDiscoveryExpandedAlert = TypeOf<typeof AttackDiscoveryExpandedAlertSchema>;
export type AttackDiscoveryExpandedAlerts = TypeOf<typeof AttackDiscoveryExpandedAlertsSchema>;
