import type { TypeOf } from '@kbn/config-schema';
import type { RequestHandler } from '@kbn/core/server';
import type { GetOneFleetServerHostRequestSchema, PostFleetServerHostRequestSchema, PutFleetServerHostRequestSchema } from '../../types';
export declare const postFleetServerHost: RequestHandler<undefined, undefined, TypeOf<typeof PostFleetServerHostRequestSchema.body>>;
export declare const getFleetServerHostHandler: RequestHandler<TypeOf<typeof GetOneFleetServerHostRequestSchema.params>>;
export declare const deleteFleetServerHostHandler: RequestHandler<TypeOf<typeof GetOneFleetServerHostRequestSchema.params>>;
export declare const putFleetServerHostHandler: RequestHandler<TypeOf<typeof PutFleetServerHostRequestSchema.params>, undefined, TypeOf<typeof PutFleetServerHostRequestSchema.body>>;
export declare const getAllFleetServerHostsHandler: RequestHandler;
