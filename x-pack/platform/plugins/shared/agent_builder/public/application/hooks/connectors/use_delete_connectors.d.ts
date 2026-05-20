import type { UseMutationOptions } from '@kbn/react-query';
import type { ConnectorItem, BulkDeleteConnectorsResponse } from '../../../../common/http_api/tools';
interface DeleteConnectorMutationVariables {
    connectorId: string;
}
type DeleteConnectorMutationOptions = UseMutationOptions<void, Error, DeleteConnectorMutationVariables>;
type DeleteConnectorSuccessCallback = NonNullable<DeleteConnectorMutationOptions['onSuccess']>;
type DeleteConnectorErrorCallback = NonNullable<DeleteConnectorMutationOptions['onError']>;
export declare const useDeleteConnectorService: ({ onSuccess, onError, }?: {
    onSuccess?: DeleteConnectorSuccessCallback;
    onError?: DeleteConnectorErrorCallback;
}) => {
    deleteConnectorSync: import("@kbn/react-query").UseMutateFunction<void, Error, DeleteConnectorMutationVariables, unknown>;
    deleteConnector: import("@kbn/react-query").UseMutateAsyncFunction<void, Error, DeleteConnectorMutationVariables, unknown>;
    isLoading: boolean;
};
export declare const useDeleteConnector: () => {
    isOpen: boolean;
    isLoading: boolean;
    connector: ConnectorItem | null;
    deleteConnector: (connector: ConnectorItem) => void;
    confirmDelete: () => Promise<void>;
    cancelDelete: () => void;
};
interface BulkDeleteConnectorsMutationVariables {
    connectorIds: string[];
}
type BulkDeleteConnectorsMutationOptions = UseMutationOptions<BulkDeleteConnectorsResponse, Error, BulkDeleteConnectorsMutationVariables>;
type BulkDeleteConnectorsSuccessCallback = NonNullable<BulkDeleteConnectorsMutationOptions['onSuccess']>;
type BulkDeleteConnectorsErrorCallback = NonNullable<BulkDeleteConnectorsMutationOptions['onError']>;
export declare const useBulkDeleteConnectorsService: ({ onSuccess, onError, }?: {
    onSuccess?: BulkDeleteConnectorsSuccessCallback;
    onError?: BulkDeleteConnectorsErrorCallback;
}) => {
    deleteConnectorsSync: import("@kbn/react-query").UseMutateFunction<BulkDeleteConnectorsResponse, Error, BulkDeleteConnectorsMutationVariables, unknown>;
    deleteConnectors: import("@kbn/react-query").UseMutateAsyncFunction<BulkDeleteConnectorsResponse, Error, BulkDeleteConnectorsMutationVariables, unknown>;
    isLoading: boolean;
};
export declare const useBulkDeleteConnectors: () => {
    isOpen: boolean;
    isLoading: boolean;
    connectors: ConnectorItem[];
    bulkDeleteConnectors: (connectors: ConnectorItem[]) => void;
    confirmDelete: () => Promise<void>;
    cancelDelete: () => void;
};
export {};
