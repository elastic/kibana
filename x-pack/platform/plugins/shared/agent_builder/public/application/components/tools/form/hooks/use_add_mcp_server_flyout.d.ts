import type { ActionConnector } from '@kbn/alerts-ui-shared';
export interface UseAddMcpServerFlyoutOptions {
    onConnectorCreated?: (connector: ActionConnector) => void;
}
export declare const useAddMcpServerFlyout: ({ onConnectorCreated, }?: UseAddMcpServerFlyoutOptions) => {
    openFlyout: () => void;
    closeFlyout: () => void;
    isOpen: boolean;
    flyout: import("react").ReactElement<import("../../../../../../../triggers_actions_ui/public/types").CreateConnectorFlyoutProps, string | import("react").JSXElementConstructor<any>>;
};
