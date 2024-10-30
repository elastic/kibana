/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem, EuiText } from '@elastic/eui';
import styled from 'styled-components';

export const StyledFilterGroupFlexItem = styled(EuiFlexItem)`
  flex-basis: 17%;
`;

export const StyledText = styled(EuiText)`
  font-weight: ${({ theme }) => theme.eui.euiFontWeightSemiBold};
`;
