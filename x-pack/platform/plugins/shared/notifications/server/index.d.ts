import type { PluginInitializerContext } from '@kbn/core/server';
export { config } from './config';
export type { NotificationsServerStart as NotificationsPluginStart } from './types';
export declare function plugin(initializerContext: PluginInitializerContext): Promise<import("./plugin").NotificationsPlugin>;
