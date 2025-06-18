/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiEmptyPromptProps } from '@elastic/eui';
import { EuiEmptyPrompt, EuiImage } from '@elastic/eui';
import { css } from '@emotion/react';

export const MLEmptyPromptCard = ({
  title,
  body,
  actions,
  iconSrc,
  iconAlt,
  css: customCss,
  'data-test-subj': dataTestSubj,
}: Omit<EuiEmptyPromptProps, 'title'> & { title: string; iconSrc: string; iconAlt: string }) => (
  <EuiEmptyPrompt
    css={
      customCss ??
      css`
        .euiEmptyPrompt__icon {
          min-inline-size: 32px !important;
        }
      `
    }
    layout="horizontal"
    hasBorder={true}
    hasShadow={false}
    icon={<EuiImage size="fullWidth" src={iconSrc} alt={iconAlt} />}
    title={<h3>{title}</h3>}
    titleSize="s"
    body={body}
    actions={actions}
    data-test-subj={dataTestSubj}
  />
);
