/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexItem, EuiText, EuiFlexGroup } from '@elastic/eui';
import styled from 'styled-components';
import { ChartSeriesData, checkIfAllValuesAreZero } from './common';
import * as i18n from './translation';

const FlexGroup = styled(EuiFlexGroup)<{ height?: string | null; width?: string | null }>`
  height: ${({ height }) => (height ? height : '100%')};
  width: ${({ width }) => (width ? width : '100%')};
  position: relative;
  margin: 0;
`;

FlexGroup.displayName = 'FlexGroup';

export const ChartPlaceHolder = ({
  height = '100%',
  width = '100%',
  data,
}: {
  height?: string | null;
  width?: string | null;
  data: ChartSeriesData[] | null | undefined;
}) => (
  <FlexGroup alignItems="center" height={height} justifyContent="center" width={width}>
    <EuiFlexItem grow={false}>
      <EuiText color="subdued" data-test-subj="chartHolderText" size="s" textAlign="center">
        {checkIfAllValuesAreZero(data)
          ? i18n.ALL_VALUES_ZEROS_TITLE
          : i18n.DATA_NOT_AVAILABLE_TITLE}
      </EuiText>
    </EuiFlexItem>
  </FlexGroup>
);
