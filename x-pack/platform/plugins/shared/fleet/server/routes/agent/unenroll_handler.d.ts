import type { RequestHandler } from '@kbn/core/server';
import type { TypeOf } from '@kbn/config-schema';
import type { PostAgentUnenrollRequestSchema, PostBulkAgentUnenrollRequestSchema } from '../../types';
export declare const postAgentUnenrollHandler: RequestHandler<TypeOf<typeof PostAgentUnenrollRequestSchema.params>, undefined, TypeOf<typeof PostAgentUnenrollRequestSchema.body>>;
export declare const postBulkAgentsUnenrollHandler: RequestHandler<undefined, undefined, TypeOf<typeof PostBulkAgentUnenrollRequestSchema.body>>;
