/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useQuery } from '@kbn/react-query';
import { ACTION_TYPE_SOURCES } from '@kbn/actions-types';
import type { ActionType, ActionTypeModel, ActionTypeRegistryContract } from '../../types';
import { useKibana } from '../../common/lib/kibana';
import { fetchConnectorSpec, transformSpecToActionTypeModel } from './use_action_type_model_utils';

const CONNECTOR_SPEC_QUERY_KEY = 'connectorSpec';

export interface UseActionTypeModelResult {
  /** The action type model, either from registry or derived from spec */
  actionTypeModel: ActionTypeModel | null;
  /** Whether the spec is currently being fetched */
  isLoading: boolean;
  /** Error if fetching the spec failed */
  error: Error | null;
  /** Whether the model was derived from a spec (vs from registry) */
  isFromSpec: boolean;
}

/**
 * Hook to get an ActionTypeModel for a given ActionType.
 *
 * For stack connectors (registered in the actionTypeRegistry), returns the model synchronously.
 * For spec-based connectors, fetches the spec from the API and transforms it into an ActionTypeModel.
 *
 * Uses React Query for caching - spec data is cached indefinitely since specs don't change at runtime.
 */
export function useActionTypeModel(
  actionTypeRegistry: ActionTypeRegistryContract,
  actionType: ActionType | null
): UseActionTypeModelResult {
  const { http } = useKibana().services;

  const registeredModel = useMemo(() => {
    if (actionType == null) {
      return null;
    }
    if (actionTypeRegistry.has(actionType.id)) {
      return actionTypeRegistry.get(actionType.id);
    }
    return null;
  }, [actionType, actionTypeRegistry]);

  const shouldFetchSpec =
    actionType != null && registeredModel == null && actionType.source === ACTION_TYPE_SOURCES.spec;

  const {
    data: specData,
    isLoading,
    error,
  } = useQuery({
    queryKey: [CONNECTOR_SPEC_QUERY_KEY, actionType?.id],
    queryFn: ({ signal }) => fetchConnectorSpec(http, actionType!.id, signal),
    enabled: shouldFetchSpec,
    staleTime: Infinity, // Specs don't change during a session
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const specBasedModel = useMemo(() => {
    if (!specData) {
      return null;
    }
    return transformSpecToActionTypeModel(specData);
  }, [specData]);

  return useMemo(
    () => ({
      actionTypeModel: registeredModel ?? specBasedModel,
      isLoading: shouldFetchSpec && isLoading,
      error: error as Error | null,
      isFromSpec: registeredModel == null && specBasedModel != null,
    }),
    [registeredModel, specBasedModel, shouldFetchSpec, isLoading, error]
  );
}
