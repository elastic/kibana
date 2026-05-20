import type { TypeOf } from '@kbn/config-schema';
import type { FleetRequestHandler, PostStandaloneAgentAPIKeyRequestSchema } from '../../types';
export declare const createStandaloneAgentApiKeyHandler: FleetRequestHandler<undefined, undefined, TypeOf<typeof PostStandaloneAgentAPIKeyRequestSchema.body>>;
