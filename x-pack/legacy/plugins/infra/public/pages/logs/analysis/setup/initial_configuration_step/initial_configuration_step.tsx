/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSpacer, EuiForm } from '@elastic/eui';
import React from 'react';

import { AnalysisSetupIndicesForm, IndicesSelection } from './analysis_setup_indices_form';
import { AnalysisSetupTimerangeForm } from './analysis_setup_timerange_form';

interface InitialConfigurationStepProps {
  setStartTime: (startTime: number | undefined) => void;
  setEndTime: (endTime: number | undefined) => void;
  startTime: number | undefined;
  endTime: number | undefined;
  selectedIndices: IndicesSelection;
  setSelectedIndices: (selectedIndices: IndicesSelection) => void;
  validationErrors?: string[];
}

export const InitialConfigurationStep: React.FunctionComponent<InitialConfigurationStepProps> = ({
  setStartTime,
  setEndTime,
  startTime,
  endTime,
  selectedIndices,
  setSelectedIndices,
  validationErrors = [],
}: InitialConfigurationStepProps) => {
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
          validationErrors={validationErrors}
        />
      </EuiForm>
    </>
  );
};
