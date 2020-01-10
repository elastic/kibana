/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';
import { EuiButton } from '@elastic/eui';

const MissingInformationPanel = styled.div`
  height: 240px;
  width: 520px;
  margin-right: 20px;
`;

export const LocationMissingWarning = () => {
  return (
    <MissingInformationPanel>
      <EuiButton iconType="alert" size="s" color="warning">
        Geo Information Missing
      </EuiButton>
    </MissingInformationPanel>
  );
};
