import type { CoreSetup, IRouter, RequestHandlerContext } from '@kbn/core/server';
import type { InferenceServerStart, InferenceStartDependencies } from '../types';
export declare function registerEndpointsRoute({ coreSetup, router, }: {
    coreSetup: CoreSetup<InferenceStartDependencies, InferenceServerStart>;
    router: IRouter<RequestHandlerContext>;
}): void;
