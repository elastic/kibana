import type { IRouter, Logger } from '@kbn/core/server';
/**
 * Registers all anonymization plugin HTTP routes.
 */
export declare const registerRoutes: (router: IRouter, logger: Logger, options: {
    active: boolean;
}) => void;
