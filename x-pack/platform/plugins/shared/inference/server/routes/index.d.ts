import type { Logger } from '@kbn/logging';
import type { CoreSetup, IRouter } from '@kbn/core/server';
import type { InferenceServerStart, InferenceStartDependencies } from '../types';
export declare const registerRoutes: ({ router, logger, coreSetup, }: {
    router: IRouter;
    logger: Logger;
    coreSetup: CoreSetup<InferenceStartDependencies, InferenceServerStart>;
}) => void;
