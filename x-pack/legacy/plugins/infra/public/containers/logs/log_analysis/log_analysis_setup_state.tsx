/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';

import { isExampleDataIndex } from '../../../../common/log_analysis';
import { ValidationIndicesError } from '../../../../common/http_api';
import { useTrackedPromise } from '../../../utils/use_tracked_promise';
import { callIndexPatternsValidate } from './api/index_patterns_validate';

type SetupHandler = (
  indices: string[],
  startTime: number | undefined,
  endTime: number | undefined
) => void;

export type ValidationIndicesUIError =
  | ValidationIndicesError
  | { error: 'NETWORK_ERROR' }
  | { error: 'TOO_FEW_SELECTED_INDICES' };

export interface ValidatedIndex {
  index: string;
  validation?: ValidationIndicesError;
  checked: boolean;
}

interface AnalysisSetupStateArguments {
  availableIndices: string[];
  cleanupAndSetupModule: SetupHandler;
  setupModule: SetupHandler;
  timestampField: string;
}

const fourWeeksInMs = 86400000 * 7 * 4;

export const useAnalysisSetupState = ({
  availableIndices,
  cleanupAndSetupModule,
  setupModule,
  timestampField,
}: AnalysisSetupStateArguments) => {
  const [startTime, setStartTime] = useState<number | undefined>(Date.now() - fourWeeksInMs);
  const [endTime, setEndTime] = useState<number | undefined>(undefined);

  // Prepare the validation
  const [validatedIndices, setValidatedIndices] = useState<ValidatedIndex[]>([]);
  const [validateIndicesRequest, validateIndices] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async () => {
        return await callIndexPatternsValidate(timestampField, availableIndices.join(','));
      },
      onResolve: ({ data }) => {
        setValidatedIndices(
          availableIndices.map(index => {
            const validation = data.errors.find(error => error.index === index);
            return {
              index,
              validation,
              checked: validation === undefined && !isExampleDataIndex(index),
            };
          })
        );
      },
      onReject: () => {
        setValidatedIndices([]);
      },
    },
    [availableIndices, timestampField]
  );

  useEffect(() => {
    validateIndices();
  }, [availableIndices]);

  const selectedIndexNames = useMemo(
    () => validatedIndices.filter(i => i.checked).map(i => i.index),
    [validatedIndices]
  );

  const setup = useCallback(() => {
    return setupModule(selectedIndexNames, startTime, endTime);
  }, [setupModule, selectedIndexNames, startTime, endTime]);

  const cleanupAndSetup = useCallback(() => {
    return cleanupAndSetupModule(selectedIndexNames, startTime, endTime);
  }, [cleanupAndSetupModule, selectedIndexNames, startTime, endTime]);

  const isValidating = useMemo(
    () =>
      validateIndicesRequest.state === 'pending' ||
      validateIndicesRequest.state === 'uninitialized',
    [validateIndicesRequest.state]
  );

  const validationErrors = useMemo<ValidationIndicesUIError[]>(() => {
    if (isValidating) {
      return [];
    }

    if (validateIndicesRequest.state === 'rejected') {
      return [{ error: 'NETWORK_ERROR' }];
    }

    if (selectedIndexNames.length === 0) {
      return [{ error: 'TOO_FEW_SELECTED_INDICES' }];
    }

    const indicesWithErrors = validatedIndices.filter(
      index => selectedIndexNames.includes(index.index) && index.validation !== undefined
    );

    if (indicesWithErrors.length > 0) {
      return indicesWithErrors.map(index => index.validation!);
    }

    return [];
  }, [selectedIndexNames, validatedIndices, validateIndicesRequest.state]);

  return {
    cleanupAndSetup,
    endTime,
    isValidating,
    selectedIndexNames,
    setEndTime,
    setStartTime,
    setup,
    startTime,
    validatedIndices,
    setValidatedIndices,
    validationErrors,
  };
};
