import type { ConnectorItem } from '../../../../../../common/http_api/tools';
export interface UseEditMcpServerFlyoutProps {
    connector: ConnectorItem | undefined;
}
export declare const useEditMcpServerFlyout: ({ connector }: UseEditMcpServerFlyoutProps) => {
    openFlyout: () => void;
    closeFlyout: () => void;
    isOpen: boolean;
    flyout: import("react").ReactElement<import("../../../../../../../triggers_actions_ui/public/types").EditConnectorFlyoutProps, string | import("react").JSXElementConstructor<any>> | null;
};
