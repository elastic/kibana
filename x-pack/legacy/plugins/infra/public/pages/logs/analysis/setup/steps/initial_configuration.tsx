/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
import { EuiSpacer, EuiForm } from '@elastic/eui';
import { AnalysisSetupTimerangeForm } from '../analysis_setup_timerange_form';
import { AnalysisSetupIndicesForm } from '../analysis_setup_indices_form';

interface InitialConfigurationProps {
  setStartTime: (startTime: number | undefined) => void;
  setEndTime: (endTime: number | undefined) => void;
  startTime: number | undefined;
  endTime: number | undefined;
  selectedIndices: Record<string, boolean>;
  setSelectedIndices: (selectedIndices: Record<string, boolean>) => void;
  validationErrors?: Array<'TOO_FEW_SELECTED_INDICES'>;
}

export const InitialConfiguration: React.FunctionComponent<InitialConfigurationProps> = ({
  setStartTime,
  setEndTime,
  startTime,
  endTime,
  selectedIndices,
  setSelectedIndices,
  validationErrors = [],
}: InitialConfigurationProps) => {
  const indicesFormValidationErrors = useMemo(
    () =>
      validationErrors.filter(validationError => validationError === 'TOO_FEW_SELECTED_INDICES'),
    [validationErrors]
  );

  return (
    <>
      <EuiSpacer size="m" />
      <EuiForm>
        <AnalysisSetupTimerangeForm
          setStartTime={setStartTime}
          setEndTime={setEndTime}
          startTime={startTime}
          endTime={endTime}
        />
        <AnalysisSetupIndicesForm
          indices={selectedIndices}
          onChangeSelectedIndices={setSelectedIndices}
          validationErrors={indicesFormValidationErrors}
        />
      </EuiForm>
    </>
  );
};
