import type { TypeOf } from '@kbn/config-schema';
import type { FleetRequestHandler, MigrateSingleAgentRequestSchema, BulkMigrateAgentsRequestSchema } from '../../types';
export declare const migrateSingleAgentHandler: FleetRequestHandler<TypeOf<typeof MigrateSingleAgentRequestSchema.params>, undefined, TypeOf<typeof MigrateSingleAgentRequestSchema.body>>;
export declare const bulkMigrateAgentsHandler: FleetRequestHandler<undefined, undefined, TypeOf<typeof BulkMigrateAgentsRequestSchema.body>>;
