/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem } from '@elastic/eui';
import styled from 'styled-components';

export const DEFAULT_LEGEND_HEIGHT = 300; // px
export const DEFAULT_MAX_CHART_HEIGHT = 300; // px

export const CalloutItem = styled.div`
  margin-left: ${({ theme }) => theme.eui.euiSizeS};
`;

export const ChartFlexItem = styled(EuiFlexItem)<{
  $maxChartHeight: number | undefined;
  $minChartHeight: number;
}>`
  ${({ $maxChartHeight }) => ($maxChartHeight != null ? `max-height: ${$maxChartHeight}px;` : '')}
  min-height: ${({ $minChartHeight }) => `${$minChartHeight}px`};
`;

export const LegendContainer = styled.div<{
  $height?: number;
  $width?: number;
}>`
  margin-left: ${({ theme }) => theme.eui.euiSizeM};
  margin-top: ${({ theme }) => theme.eui.euiSizeM};
  ${({ $height }) => ($height != null ? `height: ${$height}px;` : '')}
  scrollbar-width: thin;
  ${({ $width }) => ($width != null ? `width: ${$width}px;` : '')}
`;
