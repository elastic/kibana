/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiText, euiTextBreakWord, type EuiTextProps } from '@elastic/eui';

export interface EpisodeReasonTextProps {
  reason: string;
  size?: EuiTextProps['size'];
  'data-test-subj'?: string;
}

/**
 * Renders the rendered rule reason as plain text. Unbroken values, such as a URL, are wrapped so
 * a long reason never widens its container.
 */
export const EpisodeReasonText = ({
  reason,
  size = 's',
  'data-test-subj': dataTestSubj,
}: EpisodeReasonTextProps) => (
  <EuiText
    size={size}
    data-test-subj={dataTestSubj}
    css={css`
      ${euiTextBreakWord()}
    `}
  >
    {reason}
  </EuiText>
);
