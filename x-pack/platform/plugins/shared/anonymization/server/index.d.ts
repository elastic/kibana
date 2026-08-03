import type { PluginInitializer } from '@kbn/core/server';
import type { AnonymizationPluginSetup, AnonymizationPluginStart } from './types';
import type { AnonymizationSetupDeps, AnonymizationStartDeps } from './plugin';
export declare const plugin: PluginInitializer<AnonymizationPluginSetup, AnonymizationPluginStart, AnonymizationSetupDeps, AnonymizationStartDeps>;
export type { AnonymizationPluginSetup, AnonymizationPluginStart } from './types';
export type { AnonymizationPolicyService, AnonymizationTarget, AnonymizationProfileInitializer, AnonymizationProfileInitializerContext, CreateAnonymizationProfileParams, } from './types';
