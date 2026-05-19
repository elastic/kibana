import type { SavedObjectMigrationFn } from '@kbn/core/server';
import type { AgentPolicy } from '../../types';
export { migratePackagePolicyToV7120 } from './security_solution/to_v7_12_0';
export declare const migrateAgentPolicyToV7120: SavedObjectMigrationFn<Exclude<AgentPolicy, 'is_managed' & 'is_default_fleet_server'>, AgentPolicy>;
