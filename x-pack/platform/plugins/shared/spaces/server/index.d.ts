import type { PluginConfigDescriptor, PluginInitializerContext } from '@kbn/core/server';
export type { SpacesPluginSetupApi as SpacesPluginSetup, SpacesPluginStartApi as SpacesPluginStart, } from './plugin';
export type { SpacesServiceSetup, SpacesServiceStart } from './spaces_service';
export type { ISpacesClient, SpacesClientRepositoryFactory, SpacesClientWrapper, } from './spaces_client';
export type { Space, GetAllSpacesOptions, GetAllSpacesPurpose, GetSpaceResult } from '../common';
export declare const config: PluginConfigDescriptor;
export declare const plugin: (initializerContext: PluginInitializerContext) => Promise<import("./plugin").SpacesPlugin>;
