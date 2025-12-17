/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from '@emotion/styled';
import { useEuiTheme } from '@elastic/eui';

export function VerticalRule() {
  const { euiTheme } = useEuiTheme();

  const CentralizedContainer = styled.div`
    display: flex;
    align-items: center;
    padding: 0 ${euiTheme.size.xs};
  `;

  const Border = styled.div`
    height: 20px;
    border-right: ${euiTheme.border.thin};
  `;

  return (
    <CentralizedContainer>
      <Border />
    </CentralizedContainer>
  );
}
