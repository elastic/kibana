/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { UseEuiTheme } from '@elastic/eui';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { SymbolIcon } from '../legend/symbol_icon';
import { getIsDarkMode } from '../../../../../kibana_services';

const prependButtonStyles = {
  icon: ({ euiTheme }: UseEuiTheme) => ({
    margin: `0 ${euiTheme.size.xs}`,
  }),
};

export const PrependButton = ({ value, svg }: { value: string; svg: string }) => {
  const styles = useMemoCss(prependButtonStyles);
  return (
    <SymbolIcon
      key={value}
      css={styles.icon}
      symbolId={value}
      svg={svg}
      fill={getIsDarkMode() ? 'rgb(223, 229, 239)' : 'rgb(52, 55, 65)'}
    />
  );
};
