/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { SymbolIcon } from '../legend/symbol_icon';
import { getIsDarkMode } from '../../../../../kibana_services';

const useStyles = () => {
  const { euiTheme } = useEuiTheme();
  const styles = useMemo(
    () =>
      css({
        margin: `0 ${euiTheme.size.xs}`,
      }),
    [euiTheme]
  );
  return styles;
};

export const PrependButton = ({ value, svg }: { value: string; svg: string }) => {
  const styles = useStyles();
  return (
    <SymbolIcon
      key={value}
      css={styles}
      symbolId={value}
      svg={svg}
      fill={getIsDarkMode() ? 'rgb(223, 229, 239)' : 'rgb(52, 55, 65)'}
    />
  );
};
