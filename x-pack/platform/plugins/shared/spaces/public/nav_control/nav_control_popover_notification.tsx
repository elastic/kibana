/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIcon, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';

export const NavControlPopoverNotification = () => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiIcon
      color="primary"
      type="dot"
      size="m"
      css={css`
        position: absolute;
        top: 1px;
        right: -1px;
        pointer-events: none;
        stroke: ${euiTheme.components.buttons.backgroundText};
        stroke-width: 2px;
        paint-order: stroke;
      `}
      aria-hidden={true}
      data-test-subj="navControlPopoverNotification"
    />
  );
};
