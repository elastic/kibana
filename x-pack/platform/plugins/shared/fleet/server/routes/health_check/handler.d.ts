import type { TypeOf } from '@kbn/config-schema';
import type { FleetRequestHandler, PostHealthCheckRequestSchema } from '../../types';
export declare const postHealthCheckHandler: FleetRequestHandler<undefined, undefined, TypeOf<typeof PostHealthCheckRequestSchema.body>>;
