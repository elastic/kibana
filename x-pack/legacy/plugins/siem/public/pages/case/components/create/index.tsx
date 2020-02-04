/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiAccordion, EuiPanel } from '@elastic/eui';
import styled, { StyledComponent } from 'styled-components';

const CreateCaseAccordion: StyledComponent<
  typeof EuiAccordion,
  any, // eslint-disable-line
  { ref: React.MutableRefObject<EuiAccordion | null> },
  never
> = styled(EuiAccordion)`
  .euiAccordion__childWrapper {
    overflow: visible;
  }
`;

CreateCaseAccordion.displayName = 'CreateCaseAccordion';

export const Create = React.memo(() => <EuiPanel>{`helo`}</EuiPanel>);

Create.displayName = 'Create';
