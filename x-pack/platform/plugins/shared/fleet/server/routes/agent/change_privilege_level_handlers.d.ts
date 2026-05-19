import type { TypeOf } from '@kbn/config-schema';
import type { BulkChangeAgentsPrivilegeLevelRequestSchema, ChangeAgentPrivilegeLevelRequestSchema, FleetRequestHandler } from '../../types';
export declare const changeAgentPrivilegeLevelHandler: FleetRequestHandler<TypeOf<typeof ChangeAgentPrivilegeLevelRequestSchema.params>, undefined, TypeOf<typeof ChangeAgentPrivilegeLevelRequestSchema.body>>;
export declare const bulkChangeAgentsPrivilegeLevelHandler: FleetRequestHandler<undefined, undefined, TypeOf<typeof BulkChangeAgentsPrivilegeLevelRequestSchema.body>>;
