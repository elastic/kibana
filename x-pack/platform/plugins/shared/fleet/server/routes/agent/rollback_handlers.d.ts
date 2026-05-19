import type { RequestHandler } from '@kbn/core/server';
import type { TypeOf } from '@kbn/config-schema';
import type { PostAgentRollbackRequestSchema, PostBulkAgentRollbackRequestSchema } from '../../types';
export declare const rollbackAgentHandler: RequestHandler<TypeOf<typeof PostAgentRollbackRequestSchema.params>, undefined, undefined>;
export declare const bulkRollbackAgentHandler: RequestHandler<undefined, undefined, TypeOf<typeof PostBulkAgentRollbackRequestSchema.body>>;
