import type { PluginInitializer } from '@kbn/core/public';
import type { AgentBuilderPluginSetup, AgentBuilderPluginStart, AgentBuilderSetupDependencies, AgentBuilderStartDependencies } from './types';
import { AGENTBUILDER_FEATURE_ID, uiPrivileges } from '../common/features';
export type { AgentBuilderPluginSetup, AgentBuilderPluginStart, PublicEmbeddableConversationProps, } from './types';
export type { EmbeddableConversationProps } from './embeddable/types';
export { AGENTBUILDER_FEATURE_ID, uiPrivileges };
export { ConversationInputShell } from '@kbn/agent-builder-browser';
export type { ConversationInputShellProps } from '@kbn/agent-builder-browser';
export declare const plugin: PluginInitializer<AgentBuilderPluginSetup, AgentBuilderPluginStart, AgentBuilderSetupDependencies, AgentBuilderStartDependencies>;
