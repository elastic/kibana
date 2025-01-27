/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import styled from 'styled-components';

import { EuiCallOut, EuiText } from '@elastic/eui';

import type { InputStatusFormatter } from './input_status_utils';

const StyledEuiText = styled(EuiText)`
  text-align: left;
  white-space: normal;
`;

export const AgentDetailsIntegrationInputStatus: React.FunctionComponent<{
  inputStatusFormatter: InputStatusFormatter;
}> = memo(({ inputStatusFormatter }) => {
  return inputStatusFormatter.hasError ? (
    <EuiCallOut
      title={inputStatusFormatter.getErrorTitleFromStatus()}
      color="danger"
      iconType="error"
      data-test-subj="integrationInputErrorCallOut"
    >
      <StyledEuiText size="s" data-test-subj="integrationInputErrorDescription">
        {inputStatusFormatter.description}
      </StyledEuiText>
    </EuiCallOut>
  ) : (
    <EuiText size="s">{inputStatusFormatter.description}</EuiText>
  );
});
