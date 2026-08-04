export interface UseConnectorSelectionResult {
    selectedConnector?: string;
    selectConnector: (connectorId: string) => void;
    defaultConnectorId?: string;
    defaultConnectorOnly: boolean;
}
export declare function useConnectorSelection(): UseConnectorSelectionResult;
