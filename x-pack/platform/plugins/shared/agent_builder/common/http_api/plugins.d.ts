import type { PluginDefinition } from '@kbn/agent-builder-common';
export interface ListPluginsResponse {
    results: PluginDefinition[];
}
export type GetPluginResponse = PluginDefinition;
export type InstallPluginResponse = PluginDefinition;
export interface DeletePluginResponse {
    success: boolean;
}
export declare const PLUGIN_USED_BY_AGENTS_ERROR_CODE = "PLUGIN_USED_BY_AGENTS";
