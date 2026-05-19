import type { AgentDefinition, PluginDefinition } from '@kbn/agent-builder-common';
export declare const usePluginsMutation: ({ agent }: {
    agent: AgentDefinition | null;
}) => {
    handleAddPlugin: (plugin: PluginDefinition, { onSuccess }?: {
        onSuccess?: (pluginId: string) => void;
    }) => void;
    handleRemovePlugin: (plugin: PluginDefinition) => void;
};
