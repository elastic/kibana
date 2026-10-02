/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiEmptyPromptProps, IconType } from '@elastic/eui';
import { EuiEmptyPrompt, EuiIcon, EuiText } from '@elastic/eui';
import React, { type ReactNode } from 'react';

interface AiIndexDetailPanelEmptyPromptProps {
  iconType: IconType;
  dataTestSubj: string;
  title: ReactNode;
  paddingSize?: EuiEmptyPromptProps['paddingSize'];
}

export const AiIndexDetailPanelEmptyPrompt = ({
  iconType,
  dataTestSubj,
  title,
  paddingSize,
}: AiIndexDetailPanelEmptyPromptProps) => (
  <EuiEmptyPrompt
    paddingSize={paddingSize}
    icon={<EuiIcon type={iconType} size="xl" aria-hidden={true} color="subdued" />}
    data-test-subj={dataTestSubj}
    body={
      <EuiText size="xs" color="subdued">
        {title}
      </EuiText>
    }
  />
);
