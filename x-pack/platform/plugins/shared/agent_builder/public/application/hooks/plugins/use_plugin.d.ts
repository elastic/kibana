import type { PluginDefinition } from '@kbn/agent-builder-common';
export interface UsePluginProps {
    pluginId?: string;
    onLoadingError?: (error: Error) => void;
}
export declare const usePlugin: ({ pluginId, onLoadingError }: UsePluginProps) => {
    plugin: PluginDefinition | undefined;
    isLoading: boolean;
    error: unknown;
    isError: boolean;
};
