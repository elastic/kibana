import type { IRouter, Logger } from '@kbn/core/server';
export declare const registerProfileRoutes: (router: IRouter, logger: Logger, options: {
    active: boolean;
}) => void;
