/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiHealth, EuiText, EuiToolTip } from '@elastic/eui';
import React from 'react';

import { ChartLegendLink } from '../../data_quality_panel/tabs/styles';
import { FixedWidthLegendText } from '../../styles';

const DEFAULT_DATA_TEST_SUBJ = 'chartLegendItem';

interface Props {
  color: string | null;
  count: number | string;
  dataTestSubj?: string;
  onClick: (() => void) | undefined;
  text: string;
  textWidth?: number;
}

const ChartLegendItemComponent: React.FC<Props> = ({
  color,
  count,
  dataTestSubj = DEFAULT_DATA_TEST_SUBJ,
  onClick,
  text,
  textWidth,
}) => (
  <ChartLegendLink
    color="text"
    data-test-subj={dataTestSubj}
    disabled={onClick == null}
    onClick={onClick}
  >
    <EuiFlexGroup alignItems="center" gutterSize="none" justifyContent="spaceBetween">
      <EuiFlexItem grow={false}>
        <EuiToolTip content={text}>
          {color != null ? (
            <EuiHealth color={color}>
              <FixedWidthLegendText className="eui-textTruncate" size="xs" $width={textWidth}>
                {text}
              </FixedWidthLegendText>
            </EuiHealth>
          ) : (
            <FixedWidthLegendText className="eui-textTruncate" size="xs" $width={textWidth}>
              {text}
            </FixedWidthLegendText>
          )}
        </EuiToolTip>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiText size="xs">{count}</EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  </ChartLegendLink>
);

ChartLegendItemComponent.displayName = 'ChartLegendItemComponent';

export const ChartLegendItem = React.memo(ChartLegendItemComponent);
