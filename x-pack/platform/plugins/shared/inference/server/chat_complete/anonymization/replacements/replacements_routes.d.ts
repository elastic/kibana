import type { CoreSetup, IRouter, Logger } from '@kbn/core/server';
import type { InferenceServerStart, InferenceStartDependencies } from '../../../types';
export declare const registerReplacementsRoutes: (router: IRouter, logger: Logger, options: {
    coreSetup: CoreSetup<InferenceStartDependencies, InferenceServerStart>;
}) => void;
