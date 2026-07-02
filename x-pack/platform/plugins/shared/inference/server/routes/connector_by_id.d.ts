import type { CoreSetup, IRouter, Logger, RequestHandlerContext } from '@kbn/core/server';
import type { InferenceServerStart, InferenceStartDependencies } from '../types';
export declare function registerConnectorByIdRoute({ coreSetup, router, logger, }: {
    coreSetup: CoreSetup<InferenceStartDependencies, InferenceServerStart>;
    router: IRouter<RequestHandlerContext>;
    logger: Logger;
}): void;
