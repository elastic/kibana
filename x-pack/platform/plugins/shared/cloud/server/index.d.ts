import type { PluginInitializerContext } from '@kbn/core/server';
export type { CloudSetup, CloudStart } from './plugin';
export { config } from './config';
export declare const plugin: (initializerContext: PluginInitializerContext) => Promise<import("./plugin").CloudPlugin>;
export { getOnboardingToken } from './saved_objects';
