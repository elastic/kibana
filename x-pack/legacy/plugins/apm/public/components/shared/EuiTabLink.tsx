/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import styled from 'styled-components';
import { EuiTab } from '@elastic/eui';
import theme from '@elastic/eui/dist/eui_theme_light.json';
import { px, unit } from '../../style/variables';

const EuiTabLink = styled(EuiTab)`
  padding: 0;
  a {
    display: inline-block;
    padding: ${px(unit * 0.75)} ${px(unit)};
    ${({ isSelected }) =>
      !isSelected ? `color: ${theme.euiTextColor} !important;` : ''}
  }
`;

export { EuiTabLink };
