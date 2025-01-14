/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiEmptyPromptProps } from '@elastic/eui';
import { EuiEmptyPrompt, EuiTitle, EuiImage } from '@elastic/eui';
import { useEuiTheme } from '@elastic/eui';

export const MLEmptyPromptCard = ({
  title,
  body,
  actions,
  iconSrc,
  iconAlt,
  'data-test-subj': dataTestSubj,
}: EuiEmptyPromptProps) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiEmptyPrompt
      css={{
        '.euiEmptyPrompt__main': { height: '100%', minWidth: euiTheme.breakpoint.m, width: '100%' },
      }}
      layout="horizontal"
      hasBorder={true}
      hasShadow={false}
      icon={<EuiImage size="fullWidth" src={iconSrc} alt={iconAlt} />}
      title={
        <EuiTitle size="s">
          <h5>{title}</h5>
        </EuiTitle>
      }
      body={<p>{body}</p>}
      actions={actions}
      data-test-subj={dataTestSubj}
    />
  );
};
