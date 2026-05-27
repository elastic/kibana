/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiEmptyPromptProps } from '@elastic/eui';
import { EuiEmptyPrompt, EuiImage } from '@elastic/eui';
import type { SerializedStyles } from '@emotion/react';
import { css } from '@emotion/react';

export const MLEmptyPromptCard = ({
  title,
  body,
  actions,
  iconSrc,
  iconAlt,
  customCss,
  iconSize = 'fullWidth',
  'data-test-subj': dataTestSubj,
}: Omit<EuiEmptyPromptProps, 'title'> & {
  title: string;
  iconSrc: string;
  iconAlt: string;
  iconSize?: 'fullWidth' | 'original' | 's' | 'm' | 'l' | 'xl';
  customCss?: SerializedStyles;
}) => {
  return (
    <EuiEmptyPrompt
      css={css`
        .euiEmptyPrompt__icon {
          min-inline-size: 32px !important;
        }
        ${customCss ?? ''}
      `}
      layout="horizontal"
      hasBorder={true}
      hasShadow={false}
      icon={<EuiImage size={iconSize} src={iconSrc} alt={iconAlt} />}
      title={<h3>{title}</h3>}
      titleSize="s"
      body={body}
      actions={actions}
      data-test-subj={dataTestSubj}
      paddingSize="m"
    />
  );
};
