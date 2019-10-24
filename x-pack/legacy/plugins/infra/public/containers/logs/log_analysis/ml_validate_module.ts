/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState, useMemo } from 'react';
import { callMlValidateModuleAPI } from './api/ml_validate_module';
import { useTrackedPromise } from '../../../utils/use_tracked_promise';
import { ValidateMlModuleError } from '../../../../common/http_api';

export const useMlValidateModule = ({
  timestamp,
  indexPatternName,
}: {
  timestamp: string;
  indexPatternName: string;
}) => {
  const [mlValidateModuleErrors, setMlValidateModuleErrors] = useState<ValidateMlModuleError[]>([]);

  const [getMlValidateModuleRequest, getMlValidateModule] = useTrackedPromise(
    {
      createPromise: async () => {
        return await callMlValidateModuleAPI({ timestamp, indexPatternName });
      },
      onResolve: response => setMlValidateModuleErrors(response.data.errors),
    },
    [timestamp, indexPatternName]
  );

  const isLoading = useMemo(() => getMlValidateModuleRequest.state === 'pending', [
    getMlValidateModuleRequest.state,
  ]);

  return {
    getMlValidateModule,
    isLoading,
    mlValidateModuleErrors,
  };
};
