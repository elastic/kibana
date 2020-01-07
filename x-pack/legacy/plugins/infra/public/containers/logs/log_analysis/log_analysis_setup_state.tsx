/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import { isExampleDataIndex } from '../../../../common/log_analysis';
import {
  ValidatedIndex,
  ValidationIndicesUIError,
} from '../../../components/logging/log_analysis_setup/initial_configuration_step';
import { useTrackedPromise } from '../../../utils/use_tracked_promise';
import { ModuleDescriptor, ModuleSourceConfiguration } from './log_analysis_module_types';

type SetupHandler = (
  indices: string[],
  startTime: number | undefined,
  endTime: number | undefined
) => void;

interface AnalysisSetupStateArguments<JobType extends string> {
  cleanUpAndSetUpModule: SetupHandler;
  moduleDescriptor: ModuleDescriptor<JobType>;
  setUpModule: SetupHandler;
  sourceConfiguration: ModuleSourceConfiguration;
}

const fourWeeksInMs = 86400000 * 7 * 4;

export const useAnalysisSetupState = <JobType extends string>({
  cleanUpAndSetUpModule,
  moduleDescriptor: { validateSetupIndices },
  setUpModule,
  sourceConfiguration,
}: AnalysisSetupStateArguments<JobType>) => {
  const [startTime, setStartTime] = useState<number | undefined>(Date.now() - fourWeeksInMs);
  const [endTime, setEndTime] = useState<number | undefined>(undefined);

  const [validatedIndices, setValidatedIndices] = useState<ValidatedIndex[]>([]);

  const [validateIndicesRequest, validateIndices] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async () => {
        return await validateSetupIndices(sourceConfiguration);
      },
      onResolve: ({ data: { errors } }) => {
        setValidatedIndices(previousValidatedIndices =>
          sourceConfiguration.indices.map(indexName => {
            const previousValidatedIndex = previousValidatedIndices.filter(
              ({ name }) => name === indexName
            )[0];
            const indexValiationErrors = errors.filter(({ index }) => index === indexName);
            if (indexValiationErrors.length > 0) {
              return {
                validity: 'invalid',
                name: indexName,
                errors: indexValiationErrors,
              };
            } else {
              return {
                validity: 'valid',
                name: indexName,
                isSelected:
                  previousValidatedIndex?.validity === 'valid'
                    ? previousValidatedIndex?.isSelected
                    : !isExampleDataIndex(indexName),
              };
            }
          })
        );
      },
      onReject: () => {
        setValidatedIndices([]);
      },
    },
    [sourceConfiguration.indices]
  );

  useEffect(() => {
    validateIndices();
  }, [validateIndices]);

  const selectedIndexNames = useMemo(
    () =>
      validatedIndices
        .filter(index => index.validity === 'valid' && index.isSelected)
        .map(i => i.name),
    [validatedIndices]
  );

  const setUp = useCallback(() => {
    return setUpModule(selectedIndexNames, startTime, endTime);
  }, [setUpModule, selectedIndexNames, startTime, endTime]);

  const cleanUpAndSetUp = useCallback(() => {
    return cleanUpAndSetUpModule(selectedIndexNames, startTime, endTime);
  }, [cleanUpAndSetUpModule, selectedIndexNames, startTime, endTime]);

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

    return validatedIndices.reduce<ValidationIndicesUIError[]>((errors, index) => {
      return index.validity === 'invalid' && selectedIndexNames.includes(index.name)
        ? [...errors, ...index.errors]
        : errors;
    }, []);
  }, [isValidating, validateIndicesRequest.state, selectedIndexNames, validatedIndices]);

  return {
    cleanUpAndSetUp,
    endTime,
    isValidating,
    selectedIndexNames,
    setEndTime,
    setStartTime,
    setUp,
    startTime,
    validatedIndices,
    setValidatedIndices,
    validationErrors,
  };
};
