import type * as rt from 'io-ts';
import type { RouteValidationFunction } from '@kbn/core/server';
/**
 * Copied from x-pack/solutions/security/plugins/security_solution/server/utils/build_validation/route_validation.ts
 * This really should be in @kbn/securitysolution-io-ts-utils rather than copied yet again, however, this has types
 * from a lot of places such as RouteValidationResultFactory from core/server which in turn can pull in @kbn/schema
 * which cannot work on the front end and @kbn/securitysolution-io-ts-utils works on both front and backend.
 *
 * TODO: Figure out a way to move this function into a package rather than copying it/forking it within plugins
 */
export declare const buildRouteValidation: <T extends rt.Mixed, A = rt.TypeOf<T>>(schema: T) => RouteValidationFunction<A>;
