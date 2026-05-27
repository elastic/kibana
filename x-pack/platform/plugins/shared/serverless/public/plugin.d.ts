import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { ServerlessPluginSetup, ServerlessPluginSetupDependencies, ServerlessPluginStart, ServerlessPluginStartDependencies } from './types';
export declare class ServerlessPlugin implements Plugin<ServerlessPluginSetup, ServerlessPluginStart, ServerlessPluginSetupDependencies, ServerlessPluginStartDependencies> {
    constructor();
    setup(_core: CoreSetup, _dependencies: ServerlessPluginSetupDependencies): ServerlessPluginSetup;
    start(core: CoreStart, dependencies: ServerlessPluginStartDependencies): ServerlessPluginStart;
    stop(): void;
}
