/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { FieldRule } from '@kbn/anonymization-common';
import { isGlobalAnonymizationProfileTarget } from '@kbn/anonymization-common';
import { i18n } from '@kbn/i18n';
import { TARGET_TYPE_DATA_VIEW, TARGET_TYPE_INDEX } from '../../common/target_types';
import { targetLookupQueryKeys } from '../../common/services/target_lookup/cache_keys';
import type {
  ExpandWildcardsMode,
  TargetLookupClient,
} from '../../common/services/target_lookup/client';
import type { TargetType } from '../types';

const THIRTY_SECONDS_MS = 30 * 1000;
const ONE_MINUTE_MS = 60 * 1000;
const FIVE_MINUTES_MS = 5 * 60 * 1000;

interface QueryClientLike {
  fetchQuery: <T>(params: {
    queryKey: readonly unknown[];
    queryFn: () => Promise<T>;
    staleTime?: number;
  }) => Promise<T>;
}

interface UseTargetIdSelectionActionsParams {
  targetType: TargetType;
  targetId: string;
  includeHiddenAndSystemIndices: boolean;
  onFieldRulesChange: (rules: FieldRule[]) => void;
  queryClient: QueryClientLike;
  targetLookupClient: TargetLookupClient;
}

export const useTargetIdSelectionActions = ({
  targetType,
  targetId,
  includeHiddenAndSystemIndices,
  onFieldRulesChange,
  queryClient,
  targetLookupClient,
}: UseTargetIdSelectionActionsParams) => {
  const expandWildcards: ExpandWildcardsMode = includeHiddenAndSystemIndices ? 'all' : 'open';
  const latestCommitIdRef = useRef(0);
  const hydratedTargetKeysRef = useRef(new Set<string>());
  const [targetIdAsyncError, setTargetIdAsyncError] = useState<string | undefined>();
  const [isValidatingTargetId, setIsValidatingTargetId] = useState(false);

  const isLatestCommit = useCallback(
    (commitId: number) => latestCommitIdRef.current === commitId,
    []
  );

  useEffect(() => {
    latestCommitIdRef.current += 1;
    setIsValidatingTargetId(false);
    if (targetType !== TARGET_TYPE_INDEX) {
      setTargetIdAsyncError(undefined);
    }
  }, [targetType]);

  useEffect(() => {
    setTargetIdAsyncError(undefined);
  }, [targetId]);

  const validateConcreteIndexTarget = useCallback(
    async (targetIdValue: string, commitId: number): Promise<boolean> => {
      if (isLatestCommit(commitId)) {
        setTargetIdAsyncError(undefined);
      }
      if (targetType !== TARGET_TYPE_INDEX) {
        return true;
      }

      const trimmedTargetId = targetIdValue.trim();
      if (!trimmedTargetId) {
        return true;
      }
      if (isGlobalAnonymizationProfileTarget(targetType, trimmedTargetId)) {
        return true;
      }

      try {
        const response = await queryClient.fetchQuery({
          queryKey: targetLookupQueryKeys.resolveIndex(
            trimmedTargetId,
            targetType,
            expandWildcards
          ),
          queryFn: () => targetLookupClient.resolveIndex(trimmedTargetId, { expandWildcards }),
          staleTime: THIRTY_SECONDS_MS,
        });

        const hasExactIndexMatch = (response.indices ?? []).some(
          (item) => item.name === trimmedTargetId
        );
        if (!hasExactIndexMatch) {
          if (isLatestCommit(commitId)) {
            setTargetIdAsyncError(
              i18n.translate('anonymizationUi.profiles.targetId.validation.indexNotConcrete', {
                defaultMessage:
                  'Target id must resolve to a concrete index. Select an option labeled (index) or enter an exact index name.',
              })
            );
          }
          return false;
        }

        return true;
      } catch {
        if (isLatestCommit(commitId)) {
          setTargetIdAsyncError(
            i18n.translate('anonymizationUi.profiles.targetId.validation.indexFailed', {
              defaultMessage:
                'Unable to validate index target right now. Verify the target id and try again.',
            })
          );
        }
        return false;
      }
    },
    [expandWildcards, isLatestCommit, queryClient, targetLookupClient, targetType]
  );

  const hydrateFieldRulesFromTarget = useCallback(
    async (targetIdValue: string, commitId: number): Promise<boolean> => {
      const trimmedTargetId = targetIdValue.trim();
      if (!trimmedTargetId) {
        return true;
      }

      const targetKey = `${targetType}:${trimmedTargetId}`;
      if (hydratedTargetKeysRef.current.has(targetKey)) {
        return true;
      }

      let pattern = trimmedTargetId;
      if (targetType === TARGET_TYPE_DATA_VIEW) {
        let resolvedPatternFromList: string | undefined;
        try {
          const dataViewsResponse = await queryClient.fetchQuery({
            queryKey: targetLookupQueryKeys.dataViewsList(),
            queryFn: () => targetLookupClient.getDataViews(),
            staleTime: FIVE_MINUTES_MS,
          });
          const matchingDataView = (dataViewsResponse.data_view ?? []).find(
            (dataView) => dataView.id === trimmedTargetId
          );
          if (typeof matchingDataView?.title === 'string' && matchingDataView.title.trim()) {
            resolvedPatternFromList = matchingDataView.title;
          }
        } catch {
          // Fall through to by-id lookup.
        }

        if (resolvedPatternFromList) {
          pattern = resolvedPatternFromList;
        } else {
          try {
            const dataViewResponse = await queryClient.fetchQuery({
              queryKey: targetLookupQueryKeys.dataViewById(trimmedTargetId),
              queryFn: () => targetLookupClient.getDataViewById(trimmedTargetId),
              staleTime: FIVE_MINUTES_MS,
            });
            if (
              typeof dataViewResponse.data_view?.title === 'string' &&
              dataViewResponse.data_view.title.trim()
            ) {
              pattern = dataViewResponse.data_view.title;
            } else {
              return false;
            }
          } catch {
            return false;
          }
        }
      }

      try {
        const fieldResponse = await queryClient.fetchQuery({
          queryKey: targetLookupQueryKeys.fieldsForWildcard(pattern),
          queryFn: () => targetLookupClient.getFieldsForWildcard(pattern),
          staleTime: ONE_MINUTE_MS,
        });

        const nextRules = (fieldResponse.fields ?? [])
          .filter((field) => typeof field.name === 'string' && field.name.length > 0)
          .filter((field) => !field.metadata_field && !field.name.startsWith('_'))
          .map((field) => ({
            field: field.name,
            allowed: true,
            anonymized: false,
            entityClass: undefined,
          }))
          .sort((left, right) => left.field.localeCompare(right.field));

        if (isLatestCommit(commitId)) {
          onFieldRulesChange(nextRules);
          hydratedTargetKeysRef.current.add(targetKey);
        }
        return true;
      } catch {
        // Leave manual field rule entry available when field discovery fails.
        return false;
      }
    },
    [isLatestCommit, onFieldRulesChange, queryClient, targetLookupClient, targetType]
  );

  const applyTargetIdSelection = useCallback(
    async (value: string, options?: { hydrate?: boolean }): Promise<boolean> => {
      const shouldHydrate = options?.hydrate ?? true;
      const commitId = latestCommitIdRef.current + 1;
      latestCommitIdRef.current = commitId;
      setIsValidatingTargetId(true);
      try {
        const isConcreteIndexValid = await validateConcreteIndexTarget(value, commitId);
        if (!isConcreteIndexValid) {
          return false;
        }
        if (!shouldHydrate) {
          return true;
        }
        return hydrateFieldRulesFromTarget(value, commitId);
      } finally {
        if (isLatestCommit(commitId)) {
          setIsValidatingTargetId(false);
        }
      }
    },
    [hydrateFieldRulesFromTarget, isLatestCommit, validateConcreteIndexTarget]
  );

  return {
    targetIdAsyncError,
    isValidatingTargetId,
    applyTargetIdSelection,
  };
};
