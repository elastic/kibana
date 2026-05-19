import type { TypeOf } from '@kbn/config-schema';
import type { FleetRequestHandler } from '../../types';
import type { PostResetOnePreconfiguredAgentPoliciesSchema } from '../../types';
export declare const resetOnePreconfigurationHandler: FleetRequestHandler<TypeOf<typeof PostResetOnePreconfiguredAgentPoliciesSchema.params>, undefined, undefined>;
export declare const resetPreconfigurationHandler: FleetRequestHandler<undefined, undefined, undefined>;
