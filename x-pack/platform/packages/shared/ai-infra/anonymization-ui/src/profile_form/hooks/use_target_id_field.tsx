/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import { useCallback, useMemo, useState } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import type { FieldRule } from '@kbn/anonymization-common';
import { i18n } from '@kbn/i18n';
import { useQueryClient } from '@kbn/react-query';
import type { AnonymizationUiServices } from '../../contracts';
import { TARGET_TYPE_DATA_VIEW } from '../../common/target_types';
import { targetLookupQueryKeys } from '../../common/services/target_lookup/cache_keys';
import {
  createTargetLookupClient,
  type ExpandWildcardsMode,
} from '../../common/services/target_lookup/client';
import type { TargetType } from '../types';
import { useTargetIdSelectionActions } from './use_target_id_selection_actions';
import { useTargetIdHelpText } from './use_target_id_help_text';
import { useTargetIdOptions } from './use_target_id_options';
import { useTargetIdSearchState } from './use_target_id_search_state';

const THIRTY_SECONDS_MS = 30 * 1000;

interface UseTargetIdFieldParams {
  targetType: TargetType;
  targetId: string;
  includeHiddenAndSystemIndices: boolean;
  fetch: AnonymizationUiServices['http']['fetch'];
  onFieldRulesChange: (rules: FieldRule[]) => void;
  onTargetIdChange: (targetId: string) => void;
  unavailableTargetIds?: string[];
}

export interface UseTargetIdFieldResult {
  targetIdOptions: Array<EuiComboBoxOptionOption<string>>;
  selectedTargetIdOptions: Array<EuiComboBoxOptionOption<string>>;
  selectedTargetDisplayName?: string;
  targetIdHelpText: React.ReactNode;
  targetIdAsyncError?: string;
  isTargetIdValidating: boolean;
  isTargetIdLoading: boolean;
  onTargetIdSearchChange: (value: string) => void;
  onTargetIdFocus: () => void;
  onTargetIdSelectChange: (options: Array<EuiComboBoxOptionOption<string>>) => void;
  onTargetIdCreateOption?: (searchValue: string) => void;
  validateAndHydrateTargetId: () => Promise<boolean>;
}

export const useTargetIdField = ({
  targetType,
  targetId,
  includeHiddenAndSystemIndices,
  fetch,
  onFieldRulesChange,
  onTargetIdChange,
  unavailableTargetIds = [],
}: UseTargetIdFieldParams): UseTargetIdFieldResult => {
  const queryClient = useQueryClient();
  const targetLookupClient = useMemo(() => createTargetLookupClient({ fetch }), [fetch]);
  const expandWildcards: ExpandWildcardsMode = includeHiddenAndSystemIndices ? 'all' : 'open';
  const [shouldLoadTargetOptions, setShouldLoadTargetOptions] = useState(false);
  const unavailableTargetIdSet = useMemo(
    () => new Set(unavailableTargetIds),
    [unavailableTargetIds]
  );
  const [reservedTargetError, setReservedTargetError] = useState<string | undefined>();
  const { targetIdSearchValue, debouncedTargetSearchValue, setTargetIdSearchValue } =
    useTargetIdSearchState({ targetId });
  const { targetIdOptions, isTargetIdLoading } = useTargetIdOptions({
    targetType,
    targetIdSearchValue,
    debouncedTargetSearchValue,
    targetLookupClient,
    shouldLoadTargetOptions,
    includeHiddenAndSystemIndices,
    unavailableTargetIds,
  });
  const { targetIdAsyncError, isValidatingTargetId, applyTargetIdSelection } =
    useTargetIdSelectionActions({
      targetType,
      targetId,
      includeHiddenAndSystemIndices,
      onFieldRulesChange,
      queryClient,
      targetLookupClient,
    });

  const getReservedTargetMessage = useCallback(
    (nextValue: string) =>
      i18n.translate('anonymizationUi.profiles.basics.targetIdAlreadyHasProfile', {
        defaultMessage: 'Target "{targetId}" already has an anonymization profile',
        values: { targetId: nextValue },
      }),
    []
  );

  const hasReservedTarget = useCallback(
    (nextValue: string) => unavailableTargetIdSet.has(nextValue),
    [unavailableTargetIdSet]
  );

  const handleTargetIdCreateOption = useCallback(
    (searchValue: string) => {
      const nextValue = searchValue.trim();
      if (hasReservedTarget(nextValue)) {
        setReservedTargetError(getReservedTargetMessage(nextValue));
        return;
      }
      setReservedTargetError(undefined);
      onTargetIdChange(nextValue);
      if (nextValue) {
        void applyTargetIdSelection(nextValue);
      }
    },
    [applyTargetIdSelection, getReservedTargetMessage, hasReservedTarget, onTargetIdChange]
  );

  const handleTargetIdFocus = useCallback(() => {
    if (shouldLoadTargetOptions || targetType === TARGET_TYPE_DATA_VIEW) {
      return;
    }
    setShouldLoadTargetOptions(true);
    void queryClient.fetchQuery({
      queryKey: targetLookupQueryKeys.resolveIndex('*', targetType, expandWildcards),
      queryFn: () => targetLookupClient.resolveIndex('*', { expandWildcards }),
      staleTime: THIRTY_SECONDS_MS,
    });
  }, [expandWildcards, shouldLoadTargetOptions, targetType, queryClient, targetLookupClient]);

  const handleTargetIdSelectChange = useCallback(
    (options: EuiComboBoxOptionOption<string>[]) => {
      const nextValue = (options[0]?.value ?? options[0]?.label ?? '').trim();
      if (hasReservedTarget(nextValue)) {
        setReservedTargetError(getReservedTargetMessage(nextValue));
        return;
      }
      setReservedTargetError(undefined);
      onTargetIdChange(nextValue);
      if (nextValue) {
        void applyTargetIdSelection(nextValue);
      }
    },
    [applyTargetIdSelection, getReservedTargetMessage, hasReservedTarget, onTargetIdChange]
  );

  const validateAndHydrateTargetId = useCallback(async (): Promise<boolean> => {
    const nextValue = targetId.trim();
    if (!nextValue) {
      return true;
    }
    if (hasReservedTarget(nextValue)) {
      setReservedTargetError(getReservedTargetMessage(nextValue));
      return false;
    }
    setReservedTargetError(undefined);
    // Submit-time validation should not overwrite user-edited field rules.
    return applyTargetIdSelection(nextValue, { hydrate: false });
  }, [applyTargetIdSelection, getReservedTargetMessage, hasReservedTarget, targetId]);

  const selectedTarget = useMemo(() => {
    if (!targetId) {
      return undefined;
    }

    const matchingOption = targetIdOptions.find((option) => option.value === targetId);
    return {
      label: matchingOption?.label ?? targetId,
      value: targetId,
    };
  }, [targetId, targetIdOptions]);

  const selectedTargetIdOptions = useMemo(
    () => (selectedTarget ? [selectedTarget] : []),
    [selectedTarget]
  );

  const targetIdHelpText = useTargetIdHelpText({
    targetType,
    targetId,
    targetIdSearchValue,
    targetIdOptionsCount: targetIdOptions.length,
  });

  return {
    targetIdOptions,
    selectedTargetIdOptions,
    selectedTargetDisplayName: selectedTarget?.label,
    targetIdHelpText,
    targetIdAsyncError: reservedTargetError ?? targetIdAsyncError,
    isTargetIdValidating: isValidatingTargetId,
    isTargetIdLoading,
    onTargetIdSearchChange: setTargetIdSearchValue,
    onTargetIdFocus: handleTargetIdFocus,
    onTargetIdSelectChange: handleTargetIdSelectChange,
    onTargetIdCreateOption:
      targetType === TARGET_TYPE_DATA_VIEW ? undefined : handleTargetIdCreateOption,
    validateAndHydrateTargetId,
  };
};
