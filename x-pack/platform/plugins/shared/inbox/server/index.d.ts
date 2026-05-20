import type { PluginInitializer } from '@kbn/core/server';
import type { InboxPluginSetup, InboxPluginStart, InboxSetupDependencies, InboxStartDependencies } from './types';
export type { InboxPluginSetup, InboxPluginStart, InboxActionProvider, InboxActionProviderListParams, InboxActionProviderListResult, InboxRequestContext, } from './types';
export type { InboxActionConflictError } from './services/inbox_action_registry';
export { createInboxActionConflictError, isInboxActionConflictError, } from './services/inbox_action_registry';
export declare const plugin: PluginInitializer<InboxPluginSetup, InboxPluginStart, InboxSetupDependencies, InboxStartDependencies>;
export { config } from './config';
