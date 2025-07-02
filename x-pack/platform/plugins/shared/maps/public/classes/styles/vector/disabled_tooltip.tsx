/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode, ReactElement } from 'react';
import { EuiToolTip } from '@elastic/eui';
import { css } from '@emotion/react';

const anchorProps = { css: css({ width: '100%' }) };

export const DisabledToolTip = ({
  content,
  children,
}: {
  children: ReactElement;
  content: ReactNode;
}) => (
  <EuiToolTip anchorProps={anchorProps} content={content}>
    {children}
  </EuiToolTip>
);
