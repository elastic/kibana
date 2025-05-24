/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiTitle, IconType, UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';
import { useMemoizedStyles2 } from '@kbn/core/public';

const styles = {
  group: ({ euiTheme }: UseEuiTheme) =>
    css({
      paddingLeft: euiTheme.size.xs,
    }),
  item: css({
    flexDirection: 'row',
    alignItems: 'center',
  }),
};

export const StaticHeader = ({
  label,
  icon,
  indicator,
}: {
  label: string;
  icon?: IconType;
  indicator?: React.ReactNode;
}) => {
  const { group, item } = useMemoizedStyles2(styles);

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} className={group}>
      {icon && (
        <EuiFlexItem grow={false}>
          <EuiIcon type={icon} />
        </EuiFlexItem>
      )}
      <EuiFlexItem grow className={item}>
        <EuiTitle size="xxs">
          <h5>{label}</h5>
        </EuiTitle>
        {indicator}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
