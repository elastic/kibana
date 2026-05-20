import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { SloSharedPluginSetup, SloSharedPluginStart } from './types';
export declare class SloSharedPlugin implements Plugin<SloSharedPluginSetup, SloSharedPluginStart> {
    constructor(initContext: PluginInitializerContext);
    setup(core: CoreSetup): SloSharedPluginSetup;
    start(core: CoreStart): SloSharedPluginStart;
    stop(): void;
}
