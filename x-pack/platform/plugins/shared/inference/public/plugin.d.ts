import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { Logger } from '@kbn/logging';
import type { ConfigSchema, InferencePublicSetup, InferencePublicStart, InferenceSetupDependencies, InferenceStartDependencies } from './types';
export declare class InferencePlugin implements Plugin<InferencePublicSetup, InferencePublicStart, InferenceSetupDependencies, InferenceStartDependencies> {
    logger: Logger;
    constructor(context: PluginInitializerContext<ConfigSchema>);
    setup(coreSetup: CoreSetup<InferenceStartDependencies, InferencePublicStart>, pluginsSetup: InferenceSetupDependencies): InferencePublicSetup;
    start(coreStart: CoreStart, pluginsStart: InferenceStartDependencies): InferencePublicStart;
}
