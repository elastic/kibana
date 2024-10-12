/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import styled from 'styled-components';
import { EuiButtonGroup } from '@elastic/eui';

import { INCOMPATIBLE_TAB_ID, SAME_FAMILY_TAB_ID } from '../../../constants';

export const StyledHistoricalResultsCheckFieldsButtonGroup = styled(EuiButtonGroup)`
  min-width: 50%;
  button[data-test-subj='${INCOMPATIBLE_TAB_ID}'] {
    flex-grow: 1;
  }
  button[data-test-subj='${SAME_FAMILY_TAB_ID}'] {
    flex-grow: 1;
  }
`;
