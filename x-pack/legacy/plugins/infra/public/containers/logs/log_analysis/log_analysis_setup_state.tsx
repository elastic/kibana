/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState, useCallback, useMemo } from 'react';

import { isExampleDataIndex } from '../../../../common/log_analysis';
import { AvailableIndex } from './log_analysis_jobs';
import { ValidationIndicesUIError } from '../../../pages/logs/analysis/setup/initial_configuration_step';

type SetupHandler = (
  indices: string[],
  startTime: number | undefined,
  endTime: number | undefined
) => void;

interface AnalysisSetupStateArguments {
  availableIndices: AvailableIndex[];
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

  const [selectedIndices, setSelectedIndices] = useState<IndicesSelection>(
    availableIndices.reduce(
      (indexMap, entry) => ({
        ...indexMap,
        [entry.index]: !(availableIndices.length > 1 && isExampleDataIndex(entry.index)),
      }),
      {}
    )
  );
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
    if (selectedIndexNames.length === 0) {
      return [{ error: 'TOO_FEW_SELECTED_INDICES' }];
    }

    const indicesWithErrors = availableIndices.filter(
      index => selectedIndexNames.includes(index.index) && index.validation !== undefined
    );

    if (indicesWithErrors.length > 0) {
      return indicesWithErrors.map(index => index.validation!);
    }

    return [];
  }, [selectedIndexNames, availableIndices]);

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
