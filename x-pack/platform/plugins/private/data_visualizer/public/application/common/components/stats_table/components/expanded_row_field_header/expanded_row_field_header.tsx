/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText, useEuiTheme } from '@elastic/eui';
import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import { css } from '@emotion/react';

export const ExpandedRowFieldHeader: FC<PropsWithChildren<unknown>> = ({ children }) => {
  const { euiTheme } = useEuiTheme();

  const dvExpandedRowFieldHeader = css({
    textTransform: 'uppercase',
    textAlign: 'left',
    color: euiTheme.colors.darkShade,
    fontWeight: 'bold',
    paddingBottom: euiTheme.size.s,
  });

  return (
    <EuiText size="xs" color={'subdued'} css={dvExpandedRowFieldHeader} textAlign={'center'}>
      {children}
    </EuiText>
  );
};
