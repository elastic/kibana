import type { PluginConfigDescriptor, PluginInitializerContext } from '@kbn/core/server';
export { CasesClient } from './client';
import type { ConfigType } from './config';
export declare const config: PluginConfigDescriptor<ConfigType>;
export declare const plugin: (initializerContext: PluginInitializerContext) => Promise<import("./plugin").CasePlugin>;
export type { CasesServerSetup, CasesServerStart, CloseReasonValidator } from './types';
