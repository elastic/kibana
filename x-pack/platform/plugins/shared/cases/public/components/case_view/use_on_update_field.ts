/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';

import type { CaseUI, UpdateByKey, UpdateKey } from '../../containers/types';
import { useUpdateCase } from '../../containers/use_update_case';
import type { OnUpdateFields } from './types';
import { processFieldUpdate } from './utils';

export const useOnUpdateField = ({ caseData }: { caseData: CaseUI }) => {
  const { isLoading, mutate: updateCaseProperty } = useUpdateCase();
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  const onUpdateField = useCallback(
    ({ key, value, onSuccess, onError }: OnUpdateFields) => {
      const callUpdate = (updateKey: UpdateKey, updateValue: UpdateByKey['updateValue']) => {
        setLoadingKey(updateKey);

        updateCaseProperty(
          {
            updateKey,
            updateValue,
            caseData,
          },
          {
            onSuccess: () => {
              onSuccess?.();
              setLoadingKey(null);
            },
            onError: () => {
              onError?.();
              setLoadingKey(null);
            },
          }
        );
      };

      processFieldUpdate({ key, value: value as unknown, caseData, callUpdate });
    },
    [updateCaseProperty, caseData]
  );

  return { onUpdateField, isLoading, loadingKey };
};
