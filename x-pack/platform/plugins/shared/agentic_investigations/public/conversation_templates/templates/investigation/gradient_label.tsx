/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React from 'react';
import { EuiText } from '@elastic/eui';
import { useAiButtonGradientStyles } from '@kbn/shared-ux-ai-components';

export interface GradientLabelProps {
  children: React.ReactNode;
}

export const GradientLabel = ({ children }: GradientLabelProps): React.ReactElement => {
  const { labelCss } = useAiButtonGradientStyles({ variant: 'outlined' });

  return (
    <EuiText
      size="xs"
      component="span"
      css={[
        labelCss,
        css`
          line-height: 1;
          padding: 0;
        `,
      ]}
    >
      {children}
    </EuiText>
  );
};
