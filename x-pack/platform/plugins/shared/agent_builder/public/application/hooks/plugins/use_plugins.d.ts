export declare const usePluginsService: () => {
    plugins: import("@kbn/agent-builder-common").PluginDefinition[];
    isLoading: boolean;
    error: unknown;
    isError: boolean;
};
export interface UsePluginsProps {
    onLoadingError?: (error: Error) => void;
}
export declare const usePlugins: ({ onLoadingError }?: UsePluginsProps) => {
    plugins: import("@kbn/agent-builder-common").PluginDefinition[];
    isLoading: boolean;
    error: unknown;
    isError: boolean;
};
