/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFormRow, EuiComboBox } from '@elastic/eui';
import * as i18n from './translations';
import { PredictionsSettings } from './use_predictions_details';

interface Props {
  predictionsSettings: PredictionsSettings;
}

export const PredictionDetails: React.FC<Props> = React.memo(({ predictionsSettings }) => {
  const {
    modelOptions,
    selectedModelOptions,
    onModelOptionsChange,
    agentOptions,
    selectedAgentOptions,
    onAgentOptionsChange,
    onAgentOptionsCreate,
  } = predictionsSettings;
  return (
    <>
      <EuiFormRow
        display="rowCompressed"
        label={i18n.CONNECTORS_LABEL}
        helpText={i18n.CONNECTORS_DESCRIPTION}
      >
        <EuiComboBox
          aria-label={'model-selector'}
          compressed
          options={modelOptions}
          selectedOptions={selectedModelOptions}
          onChange={onModelOptionsChange}
        />
      </EuiFormRow>

      <EuiFormRow
        display="rowCompressed"
        label={i18n.AGENTS_LABEL}
        helpText={i18n.AGENTS_DESCRIPTION}
      >
        <EuiComboBox
          aria-label={'agent-selector'}
          compressed
          onCreateOption={onAgentOptionsCreate}
          options={agentOptions}
          selectedOptions={selectedAgentOptions}
          onChange={onAgentOptionsChange}
        />
      </EuiFormRow>
    </>
  );
});

PredictionDetails.displayName = 'PredictionDetails';
