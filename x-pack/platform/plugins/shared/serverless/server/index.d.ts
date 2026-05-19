export { config } from './config';
export declare const plugin: () => Promise<import("./plugin").ServerlessPlugin>;
export type { ServerlessServerSetup as ServerlessPluginSetup, ServerlessServerStart as ServerlessPluginStart, } from './types';
