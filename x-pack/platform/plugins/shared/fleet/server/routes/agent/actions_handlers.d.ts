import type { RequestHandler } from '@kbn/core/server';
import type { TypeOf } from '@kbn/config-schema';
import type { PostNewAgentActionRequestSchema, PostCancelActionRequestSchema } from '../../types/rest_spec';
import type { ActionsService } from '../../services/agents';
export declare const postNewAgentActionHandlerBuilder: (actionsService: ActionsService) => RequestHandler<TypeOf<typeof PostNewAgentActionRequestSchema.params>, undefined, TypeOf<typeof PostNewAgentActionRequestSchema.body>>;
export declare const postCancelActionHandlerBuilder: (actionsService: ActionsService) => RequestHandler<TypeOf<typeof PostCancelActionRequestSchema.params>, undefined, undefined>;
