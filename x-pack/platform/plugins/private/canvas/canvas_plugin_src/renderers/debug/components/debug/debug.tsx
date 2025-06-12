/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiCode, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

const LimitRows = (key: string, value: any) => {
  if (key === 'rows') {
    return value.slice(0, 99);
  }
  return value;
};

export const Debug = ({ payload }: { payload: unknown }) => {
  const { wrapperStyles, contentStyles } = useStyles();

  return (
    <EuiCode css={wrapperStyles}>
      <pre data-test-subj="canvasDebug__content" css={contentStyles} className="eui-scrollBar">
        {JSON.stringify(payload, LimitRows, 2)}
      </pre>
    </EuiCode>
  );
};

const useStyles = () => {
  const { euiTheme } = useEuiTheme();
  const styles = useMemo(() => {
    return {
      wrapperStyles: css({
        padding: 0,
        width: '100%',
        height: '100%',
      }),
      contentStyles: css({
        width: '100%',
        height: '100%',
        overflow: 'auto',
        padding: euiTheme.size.base,
      }),
    };
  }, [euiTheme]);
  return styles;
};
