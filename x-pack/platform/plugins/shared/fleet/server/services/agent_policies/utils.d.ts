import type { SavedObject } from '@kbn/core-saved-objects-common/src/server_types';
import type { AgentPolicy } from '../../../common';
import type { AgentPolicySOAttributes } from '../../types';
export declare const mapAgentPolicySavedObjectToAgentPolicy: ({ id, namespaces, version, created_at, attributes, }: SavedObject<AgentPolicySOAttributes>) => AgentPolicy;
