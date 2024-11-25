/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiThemeVars } from '@kbn/ui-theme';
import React, { ReactNode } from 'react';
import { css } from '@emotion/react';

interface ChatItemTitleProps {
  actionsTrigger?: ReactNode;
  title: string;
}

export function ChatItemTitle({ actionsTrigger, title }: ChatItemTitleProps) {
  const containerCSS = css`
    position: absolute;
    top: 2;
    right: ${euiThemeVars.euiSizeS};
  `;
  return (
    <>
      {title}
      {actionsTrigger ? <div css={containerCSS}>{actionsTrigger}</div> : null}
    </>
  );
}
