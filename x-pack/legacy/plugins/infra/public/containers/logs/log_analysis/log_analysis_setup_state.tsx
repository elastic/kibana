/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';

import { isExampleDataIndex } from '../../../../common/log_analysis';
import { ValidationIndicesUIError } from '../../../pages/logs/analysis/setup/initial_configuration_step';
import { ValidationIndicesError } from '../../../../common/http_api';
import { useTrackedPromise } from '../../../utils/use_tracked_promise';
import { callIndexPatternsValidate } from './api/index_patterns_validate';

type SetupHandler = (
  indices: string[],
  startTime: number | undefined,
  endTime: number | undefined
) => void;

interface ValidatedIndex {
  index: string;
  validation?: ValidationIndicesError;
}

interface AnalysisSetupStateArguments {
  availableIndices: string[];
  cleanupAndSetupModule: SetupHandler;
  setupModule: SetupHandler;
}

type IndicesSelection = Record<string, boolean>;

const fourWeeksInMs = 86400000 * 7 * 4;

export const useAnalysisSetupState = ({
  availableIndices,
  cleanupAndSetupModule,
  setupModule,
}: AnalysisSetupStateArguments) => {
  const [startTime, setStartTime] = useState<number | undefined>(Date.now() - fourWeeksInMs);
  const [endTime, setEndTime] = useState<number | undefined>(undefined);

  const [selectedIndices, setSelectedIndices] = useState<IndicesSelection>({});

  // Prepare the validation
  const [validatedIndices, setValidatedIndices] = useState<ValidatedIndex[]>([]);
  const [, validateIndices] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async () => {
        return await callIndexPatternsValidate('@timestamp', availableIndices.join(','));
      },
      onResolve: ({ data }) => {
        setValidatedIndices(
          availableIndices.map(index => ({
            index,
            validation: data.errors.find(error => error.index === index),
          }))
        );

        // By default select only indices that have no errors
        setSelectedIndices(
          availableIndices.reduce<IndicesSelection>(
            (map, index) => ({
              ...map,
              [index]:
                !data.errors.some(error => error.index === index) && !isExampleDataIndex(index),
            }),
            {}
          )
        );
      },
      onReject: () => {},
    },
    [availableIndices, timestampField]
  );

  useEffect(() => {
    validateIndices();
  }, [availableIndices]);

  const selectedIndexNames = useMemo(
    () =>
      Object.entries(selectedIndices)
        .filter(([_indexName, isSelected]) => isSelected)
        .map(([indexName]) => indexName),
    [selectedIndices, availableIndices]
  );

  const setup = useCallback(() => {
    return setupModule(selectedIndexNames, startTime, endTime);
  }, [setupModule, selectedIndexNames, startTime, endTime]);

  const cleanupAndSetup = useCallback(() => {
    return cleanupAndSetupModule(selectedIndexNames, startTime, endTime);
  }, [cleanupAndSetupModule, selectedIndexNames, startTime, endTime]);

  const validationErrors = useMemo<ValidationIndicesUIError[]>(() => {
    if (validatedIndices.length === 0) {
      return [];
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
  }, [selectedIndexNames, validatedIndices]);

  return {
    cleanupAndSetup,
    endTime,
    selectedIndexNames,
    selectedIndices,
    setEndTime,
    setSelectedIndices,
    setStartTime,
    setup,
    startTime,
    validationErrors,
  };
};
