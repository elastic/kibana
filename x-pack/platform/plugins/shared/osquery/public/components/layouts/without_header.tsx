/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import { EuiPage, EuiPageBody, EuiSpacer } from '@elastic/eui';
import type { UseEuiTheme } from '@elastic/eui';

export const pageCss = ({ euiTheme }: UseEuiTheme) => ({
  background: euiTheme.colors.emptyShade,
  width: '100%',
  alignSelf: 'center',
  marginLeft: 0,
  marginRight: 0,
  flex: 1,
});

export const contentCss = {
  height: '100%',
};

interface Props {
  restrictWidth?: number;
  children?: React.ReactNode;
}

export const WithoutHeaderLayout: React.FC<Props> = ({ restrictWidth, children }) => (
  <Fragment>
    <EuiPage css={pageCss} restrictWidth={restrictWidth || 1200}>
      <EuiPageBody>
        <div css={contentCss}>
          <EuiSpacer size="m" />
          {children}
        </div>
      </EuiPageBody>
    </EuiPage>
  </Fragment>
);
