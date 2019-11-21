/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiText, EuiToolTip } from '@elastic/eui';

interface Props {
  example: string | object;
}

export const Example: FC<Props> = ({ example }) => {
  const exampleStr = typeof example === 'string' ? example : JSON.stringify(example);

  // Use 95% width for each example so that the truncation ellipses show up when
  // wrapped inside a tooltip.
  return (
    <EuiFlexGroup gutterSize="s" alignItems="center">
      <EuiFlexItem grow={false} style={{ width: '95%' }} className="eui-textTruncate">
        <EuiToolTip content={exampleStr}>
          <EuiText size="s" className="eui-textTruncate">
            {exampleStr}
          </EuiText>
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
