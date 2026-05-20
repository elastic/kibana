import type { RequestHandler, RouteMethod } from '@kbn/core/server';
import type { ReportingCore } from '../../core';
import type { ReportingUser, ReportingRequestHandlerContext } from '../../types';
export type RequestHandlerUser<P, Q, B> = RequestHandler<P, Q, B, ReportingRequestHandlerContext> extends (...a: infer U) => infer R ? (user: ReportingUser, ...a: U) => R : never;
export declare const authorizedUserPreRouting: <P, Q, B>(reporting: ReportingCore, handler: RequestHandlerUser<P, Q, B>) => RequestHandler<P, Q, B, ReportingRequestHandlerContext, RouteMethod>;
