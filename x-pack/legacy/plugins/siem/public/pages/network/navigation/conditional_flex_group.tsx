/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup } from '@elastic/eui';
import styled from 'styled-components';

export const ConditionalFlexGroup = styled(EuiFlexGroup)`
  @media only screen and (min-width: 1441px) {
    flex-direction: row;
  }
`;

ConditionalFlexGroup.displayName = 'ConditionalFlexGroup';
