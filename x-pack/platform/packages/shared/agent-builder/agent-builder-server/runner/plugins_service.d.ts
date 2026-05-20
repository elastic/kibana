/**
 * Runtime service to resolve plugin-contributed skill IDs during agent execution.
 */
export interface PluginsService {
    /**
     * Given a list of plugin IDs, returns the union of all skill IDs contributed by those plugins.
     * Plugins that are not found are silently ignored.
     */
    resolveSkillIds(pluginIds: string[]): Promise<string[]>;
}
