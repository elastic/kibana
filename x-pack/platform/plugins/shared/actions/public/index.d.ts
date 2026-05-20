import type { PluginInitializerContext } from '@kbn/core/public';
import type { ActionsPublicPluginSetup } from './plugin';
import { Plugin } from './plugin';
export type { ActionsPublicPluginSetup };
export { Plugin };
export declare function plugin(context: PluginInitializerContext): Plugin;
