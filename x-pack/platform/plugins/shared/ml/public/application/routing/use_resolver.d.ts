import React from 'react';
import { type MlCapabilitiesKey } from '@kbn/ml-common-types/capabilities';
import type { ResolverResults, Resolvers } from './resolvers';
export interface RouteResolverContext {
    initialized: boolean;
    resolvedComponent?: React.ReactElement;
}
/**
 * Resolves required dependencies for landing on the page
 * and performs redirects if needed.
 *
 * @param requiredLicense
 * @param requiredCapabilities
 */
export declare const useRouteResolver: (requiredLicense: "full" | "basic", requiredCapabilities: MlCapabilitiesKey[], customResolvers?: Resolvers) => {
    context: RouteResolverContext;
    results: ResolverResults;
};
