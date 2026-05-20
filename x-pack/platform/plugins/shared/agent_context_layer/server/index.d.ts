import type { PluginInitializer } from '@kbn/core/server';
import type { AgentContextLayerPluginSetup, AgentContextLayerPluginStart, AgentContextLayerSetupDependencies, AgentContextLayerStartDependencies } from './types';
export type { AgentContextLayerPluginSetup, AgentContextLayerPluginStart, SmlIndexAttachmentParams, } from './types';
export type { SmlTypeDefinition, SmlChunk, SmlData, SmlContext, SmlToAttachmentContext, SmlListItem, SmlSearchResult, SmlSearchFilters, SmlDocument, SmlIndexAction, } from './services/sml/types';
export type { SmlResolvedItemResult } from './services/sml/execute_sml_attach_items';
export { smlElasticsearchIndexMappings, smlIndexName } from './services/sml/sml_storage';
export { SmlSearchFilterType } from '../common/http_api/sml';
export declare const plugin: PluginInitializer<AgentContextLayerPluginSetup, AgentContextLayerPluginStart, AgentContextLayerSetupDependencies, AgentContextLayerStartDependencies>;
