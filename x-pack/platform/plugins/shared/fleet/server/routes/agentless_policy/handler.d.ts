import type { TypeOf } from '@kbn/config-schema';
import type { CreateAgentlessPolicyRequestSchema } from '../../../common/types';
import type { FleetRequestHandler } from '../../types';
import type { DeleteAgentlessPolicyRequestSchema } from '../../../common/types/rest_spec/agentless_policy';
export declare const syncAgentlessPoliciesHandler: FleetRequestHandler<undefined, undefined, {
    dryRun?: boolean;
}>;
export declare const createAgentlessPolicyHandler: FleetRequestHandler<undefined, TypeOf<typeof CreateAgentlessPolicyRequestSchema.query>, TypeOf<typeof CreateAgentlessPolicyRequestSchema.body>>;
export declare const deleteAgentlessPolicyHandler: FleetRequestHandler<TypeOf<typeof DeleteAgentlessPolicyRequestSchema.params>, TypeOf<typeof DeleteAgentlessPolicyRequestSchema.query>>;
