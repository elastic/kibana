import type { CoreSetup, IRouter, Logger } from '@kbn/core/server';
import type { SmlService } from '../services/sml/types';
import type { AgentContextLayerStartDependencies, AgentContextLayerPluginStart } from '../types';
export declare const registerGetRoute: ({ router, coreSetup, logger, getSmlService, }: {
    router: IRouter;
    coreSetup: CoreSetup<AgentContextLayerStartDependencies, AgentContextLayerPluginStart>;
    logger: Logger;
    getSmlService: () => SmlService;
}) => void;
