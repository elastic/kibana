export interface LocationState {
    shouldStickToBottom?: boolean;
    initialMessage?: string;
}
export declare const INFERENCE_MANAGEMENT_APP_ID = "management";
export declare const INFERENCE_MANAGEMENT_PATH = "/modelManagement/model_settings";
export declare const useIsOnManagementLlmConnectorsPage: () => boolean;
export declare const useNavigation: () => {
    createAgentBuilderUrl: (path: string, params?: Record<string, string>) => string;
    navigateToAgentBuilderUrl: (path: string, params?: Record<string, string>, state?: LocationState) => void;
    navigateToManageConnectors: () => Promise<void>;
    manageConnectorsUrl: string;
};
