import type { SavedObjectModelDataBackfillFn } from '@kbn/core-saved-objects-server';
import type { AgentPolicy } from '../../../common';
export declare const backfillAgentPolicyToV4: SavedObjectModelDataBackfillFn<AgentPolicy, AgentPolicy>;
