/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiHealth } from '@elastic/eui';
import React from 'react';

interface Props {
  color: string;
  count: number;
  onClick: () => void;
  text: string;
}

const ChartLegendItemComponent: React.FC<Props> = ({ color, count, onClick, text }) => {
  return (
    <EuiFlexGroup alignItems="center" gutterSize="none" justifyContent="spaceBetween">
      <EuiFlexItem grow={false}>
        <EuiHealth color={color}>
          <EuiButtonEmpty aria-label={text} color="text" onClick={onClick}>
            {text}
          </EuiButtonEmpty>
        </EuiHealth>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty aria-label={String(count)} color="text" onClick={onClick}>
          <div>{count}</div>
        </EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

ChartLegendItemComponent.displayName = 'ChartLegendItemComponent';

export const ChartLegendItem = React.memo(ChartLegendItemComponent);
