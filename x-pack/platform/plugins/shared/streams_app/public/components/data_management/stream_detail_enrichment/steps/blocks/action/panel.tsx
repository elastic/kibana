/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme, EuiPanel } from '@elastic/eui';
import { css } from '@emotion/react';
import type { PropsWithChildren } from 'react';
import React from 'react';

export const ActionPanel = (props: PropsWithChildren) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiPanel
      hasBorder
      data-test-subj="streamsAppProcessorConfigurationListItem"
      css={css`
        border: ${euiTheme.border.thin};
        padding: ${euiTheme.size.m};
      `}
      {...props}
    />
  );
};
