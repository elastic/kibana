import type { InstallPluginResponse } from '../../../../common/http_api/plugins';
interface InstallFromUrlVariables {
    url: string;
    pluginName?: string;
}
export declare const useInstallPluginFromUrl: ({ onSuccess, }?: {
    onSuccess?: (data: InstallPluginResponse) => void;
}) => {
    installFromUrl: import("@kbn/react-query").UseMutateAsyncFunction<import("@kbn/agent-builder-common").PluginDefinition, Error, InstallFromUrlVariables, unknown>;
    isLoading: boolean;
};
interface UploadPluginVariables {
    file: File;
    pluginName?: string;
}
export declare const useUploadPlugin: ({ onSuccess, }?: {
    onSuccess?: (data: InstallPluginResponse) => void;
}) => {
    uploadPlugin: import("@kbn/react-query").UseMutateAsyncFunction<import("@kbn/agent-builder-common").PluginDefinition, Error, UploadPluginVariables, unknown>;
    isLoading: boolean;
};
export {};
