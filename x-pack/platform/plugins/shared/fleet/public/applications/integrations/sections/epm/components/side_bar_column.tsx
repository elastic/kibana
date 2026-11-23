/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import styled from 'styled-components';
import { EuiFlexItem } from '@elastic/eui';

import { getIconPanelWidth } from '../screens/detail/components/icon_panel';

export const SideBarColumn = styled(EuiFlexItem)`
  max-width: ${(props) => getIconPanelWidth(props.theme.eui.euiSize, props.theme.eui.euiSizeXL)}px;

  // Matches the fixed width of the header icon panel so content never slides under it
  @media (min-width: ${(props) => props.theme.eui.euiBreakpoints.m}) {
    flex: 0 0 ${(props) => getIconPanelWidth(props.theme.eui.euiSize, props.theme.eui.euiSizeXL)}px;
  }
`;
