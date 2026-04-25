/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { DimensionTrigger } from '@kbn/visualization-ui-components';
import { useEuiTheme } from '@elastic/eui';

export const FakeDimensionButton = ({ label }: { label: string }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      css={css`
        display: flex;
        align-items: center;
        border-radius: ${euiTheme.border.radius.medium};
        min-height: ${euiTheme.size.xl};

        cursor: default !important;
        background-color: ${euiTheme.colors.lightShade} !important;
        border-color: transparent !important;
        box-shadow: none !important;
        padding: 0 ${euiTheme.size.s};
      `}
    >
      <DimensionTrigger label={label} id="lns-fakeDimension" dataTestSubj="lns-fakeDimension" />
    </div>
  );
};
