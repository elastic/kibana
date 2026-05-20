import type { RequestHandler } from '@kbn/core/server';
import type { TypeOf } from '@kbn/config-schema';
import type { PostBulkRemoveCollectorsRequestSchema, PostRemoveCollectorRequestSchema } from '../../types';
export declare const postRemoveCollectorHandler: RequestHandler<TypeOf<typeof PostRemoveCollectorRequestSchema.params>>;
export declare const postBulkRemoveCollectorsHandler: RequestHandler<undefined, undefined, TypeOf<typeof PostBulkRemoveCollectorsRequestSchema.body>>;
