import type { IRouter } from '@kbn/core/server';
import type { InternalServices } from '../types';
export declare const registerInstallationRoutes: ({ router, getServices, }: {
    router: IRouter;
    getServices: () => InternalServices;
}) => void;
