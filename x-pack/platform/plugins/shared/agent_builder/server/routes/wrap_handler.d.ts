import type { Logger, RequestHandler } from '@kbn/core/server';
import type { AgentBuilderHandlerContext } from '../request_handler_context';
export interface RouteWrapConfig {
    /**
     * The feature flag to gate this route behind.
     * Defaults to false (no feature flag gating).
     */
    featureFlag?: string | false;
    /**
     * If true, will not check license level
     */
    ignoreLicense?: boolean;
}
export declare const getHandlerWrapper: ({ logger }: {
    logger: Logger;
}) => <P, Q, B, Context extends AgentBuilderHandlerContext>(handler: RequestHandler<P, Q, B, Context>, { featureFlag, ignoreLicense }?: RouteWrapConfig) => RequestHandler<P, Q, B, Context>;
