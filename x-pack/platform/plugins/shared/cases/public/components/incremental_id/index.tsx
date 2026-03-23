/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiText } from '@elastic/eui';
import React from 'react';
import { css } from '@emotion/react';

export const IncrementalIdText = React.memo<{ incrementalId: number }>(({ incrementalId }) => (
  <EuiText
    color="subdued"
    size="s"
    data-test-subj="cases-incremental-id-text"
    css={css`
      user-select: all;
    `}
  >
    {'#'}
    {incrementalId}
  </EuiText>
));
IncrementalIdText.displayName = 'IncrementalIdText';
