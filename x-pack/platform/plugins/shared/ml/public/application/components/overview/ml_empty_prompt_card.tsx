/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiEmptyPromptProps } from '@elastic/eui';
import { EuiEmptyPrompt, EuiImage } from '@elastic/eui';

export const MLEmptyPromptCard = ({
  title,
  body,
  actions,
  iconSrc,
  iconAlt,
  'data-test-subj': dataTestSubj,
}: Omit<EuiEmptyPromptProps, 'title'> & { title: string; iconSrc: string; iconAlt: string }) => (
  <EuiEmptyPrompt
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
