import type { RequestHandler } from '@kbn/core/server';
import type { TypeOf } from '@kbn/config-schema';
import type { GetOneFleetProxyRequestSchema, PostFleetProxyRequestSchema, PutFleetProxyRequestSchema } from '../../types';
export declare const postFleetProxyHandler: RequestHandler<undefined, undefined, TypeOf<typeof PostFleetProxyRequestSchema.body>>;
export declare const putFleetProxyHandler: RequestHandler<TypeOf<typeof PutFleetProxyRequestSchema.params>, undefined, TypeOf<typeof PutFleetProxyRequestSchema.body>>;
export declare const getAllFleetProxyHandler: RequestHandler;
export declare const deleteFleetProxyHandler: RequestHandler<TypeOf<typeof GetOneFleetProxyRequestSchema.params>>;
export declare const getFleetProxyHandler: RequestHandler<TypeOf<typeof GetOneFleetProxyRequestSchema.params>>;
