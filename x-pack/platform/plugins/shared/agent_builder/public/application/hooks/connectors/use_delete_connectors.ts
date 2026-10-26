/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseMutationOptions } from '@kbn/react-query';
import { useMutation, useQueryClient } from '@kbn/react-query';
import { useCallback, useState } from 'react';
import type {
  ConnectorItem,
  BulkDeleteConnectorsResponse,
} from '../../../../common/http_api/tools';
import { queryKeys } from '../../query_keys';
import { labels } from '../../utils/i18n';
import { useAgentBuilderServices } from '../use_agent_builder_service';
import { useKibana } from '../use_kibana';
import { useToasts } from '../use_toasts';

// --- Single delete ---

interface DeleteConnectorMutationVariables {
  connectorId: string;
}

type DeleteConnectorMutationOptions = UseMutationOptions<
  void,
  Error,
  DeleteConnectorMutationVariables
>;

type DeleteConnectorSuccessCallback = NonNullable<DeleteConnectorMutationOptions['onSuccess']>;
type DeleteConnectorErrorCallback = NonNullable<DeleteConnectorMutationOptions['onError']>;

export const useDeleteConnectorService = ({
  onSuccess,
  onError,
}: {
  onSuccess?: DeleteConnectorSuccessCallback;
  onError?: DeleteConnectorErrorCallback;
} = {}) => {
  const {
    services: { http },
  } = useKibana();
  const queryClient = useQueryClient();

  const { mutate, mutateAsync, isLoading } = useMutation<
    void,
    Error,
    DeleteConnectorMutationVariables
  >({
    mutationFn: async ({ connectorId }) => {
      await http.delete(`/api/actions/connector/${encodeURIComponent(connectorId)}`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.connectors.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.tools.connectors.list() });
    },
    onSuccess,
    onError,
  });

  return { deleteConnectorSync: mutate, deleteConnector: mutateAsync, isLoading };
};

export const useDeleteConnector = () => {
  const { addSuccessToast, addErrorToast } = useToasts();
  const [connectorToDelete, setConnectorToDelete] = useState<ConnectorItem | null>(null);

  const isOpen = connectorToDelete !== null;

  const deleteConnector = useCallback((connector: ConnectorItem) => {
    setConnectorToDelete(connector);
  }, []);

  const handleSuccess: DeleteConnectorSuccessCallback = (_data, { connectorId }) => {
    const name = connectorToDelete?.name ?? connectorId;
    addSuccessToast({ title: labels.connectors.deleteConnectorSuccessToast(name) });
    setConnectorToDelete(null);
  };

  const handleError: DeleteConnectorErrorCallback = (_error, { connectorId }) => {
    const name = connectorToDelete?.name ?? connectorId;
    addErrorToast({ title: labels.connectors.deleteConnectorErrorToast(name) });
    setConnectorToDelete(null);
  };

  const { deleteConnector: deleteConnectorMutation, isLoading } = useDeleteConnectorService({
    onSuccess: handleSuccess,
    onError: handleError,
  });

  const confirmDelete = useCallback(async () => {
    if (!connectorToDelete) return;
    await deleteConnectorMutation({ connectorId: connectorToDelete.id });
  }, [connectorToDelete, deleteConnectorMutation]);

  const cancelDelete = useCallback(() => {
    setConnectorToDelete(null);
  }, []);

  return {
    isOpen,
    isLoading,
    connector: connectorToDelete,
    deleteConnector,
    confirmDelete,
    cancelDelete,
  };
};

// --- Bulk delete ---

interface BulkDeleteConnectorsMutationVariables {
  connectorIds: string[];
}

type BulkDeleteConnectorsMutationOptions = UseMutationOptions<
  BulkDeleteConnectorsResponse,
  Error,
  BulkDeleteConnectorsMutationVariables
>;

type BulkDeleteConnectorsSuccessCallback = NonNullable<
  BulkDeleteConnectorsMutationOptions['onSuccess']
>;
type BulkDeleteConnectorsErrorCallback = NonNullable<
  BulkDeleteConnectorsMutationOptions['onError']
>;

export const useBulkDeleteConnectorsService = ({
  onSuccess,
  onError,
}: {
  onSuccess?: BulkDeleteConnectorsSuccessCallback;
  onError?: BulkDeleteConnectorsErrorCallback;
} = {}) => {
  const { toolsService } = useAgentBuilderServices();
  const queryClient = useQueryClient();

  const { mutate, mutateAsync, isLoading } = useMutation<
    BulkDeleteConnectorsResponse,
    Error,
    BulkDeleteConnectorsMutationVariables
  >({
    mutationFn: ({ connectorIds }) => toolsService.bulkDeleteConnectors(connectorIds),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.connectors.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.tools.connectors.list() });
    },
    onSuccess,
    onError,
  });

  return { deleteConnectorsSync: mutate, deleteConnectors: mutateAsync, isLoading };
};

export const useBulkDeleteConnectors = () => {
  const { addSuccessToast, addErrorToast } = useToasts();
  const [connectorsToDelete, setConnectorsToDelete] = useState<ConnectorItem[]>([]);

  const isOpen = connectorsToDelete.length > 0;

  const bulkDeleteConnectors = useCallback((connectors: ConnectorItem[]) => {
    setConnectorsToDelete(connectors);
  }, []);

  const handleSuccess: BulkDeleteConnectorsSuccessCallback = ({ results }) => {
    const succeeded = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    if (failed.length === 0) {
      addSuccessToast({
        title: labels.connectors.bulkDeleteConnectorsSuccessToast(succeeded.length),
      });
    } else if (succeeded.length === 0) {
      addErrorToast({
        title: labels.connectors.bulkDeleteConnectorsErrorToast(failed.length),
      });
    } else {
      addSuccessToast({
        title: labels.connectors.bulkDeleteConnectorsSuccessToast(succeeded.length),
      });
      addErrorToast({
        title: labels.connectors.bulkDeleteConnectorsErrorToast(failed.length),
      });
    }
    setConnectorsToDelete([]);
  };

  const handleError: BulkDeleteConnectorsErrorCallback = (_error, { connectorIds }) => {
    addErrorToast({
      title: labels.connectors.bulkDeleteConnectorsErrorToast(connectorIds.length),
    });
    setConnectorsToDelete([]);
  };

  const { deleteConnectors: deleteConnectorsMutation, isLoading } = useBulkDeleteConnectorsService({
    onSuccess: handleSuccess,
    onError: handleError,
  });

  const confirmDelete = useCallback(async () => {
    if (!connectorsToDelete.length) return;
    await deleteConnectorsMutation({
      connectorIds: connectorsToDelete.map((c) => c.id),
    });
  }, [connectorsToDelete, deleteConnectorsMutation]);

  const cancelDelete = useCallback(() => {
    setConnectorsToDelete([]);
  }, []);

  return {
    isOpen,
    isLoading,
    connectors: connectorsToDelete,
    bulkDeleteConnectors,
    confirmDelete,
    cancelDelete,
  };
};
