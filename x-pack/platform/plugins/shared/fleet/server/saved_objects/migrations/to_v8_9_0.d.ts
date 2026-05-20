import type { SavedObjectMigrationFn } from '@kbn/core/server';
import type { AgentPolicy } from '../../types';
export declare const migrateAgentPolicyToV890: SavedObjectMigrationFn<Exclude<AgentPolicy, 'is_protected'>, AgentPolicy>;
