import type { PluginInitializerContext } from '@kbn/core/server';
import type { SloSharedPluginSetup, SloSharedPluginStart } from './types';
declare const plugin: (initContext: PluginInitializerContext) => Promise<import("./plugin").SloSharedPlugin>;
export type { SloSharedPluginSetup, SloSharedPluginStart };
export { plugin };
