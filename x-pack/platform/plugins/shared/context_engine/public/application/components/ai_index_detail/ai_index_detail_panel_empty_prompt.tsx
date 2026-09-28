/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconType } from '@elastic/eui';
import { EuiEmptyPrompt } from '@elastic/eui';
import React, { type ReactNode } from 'react';

interface AiIndexDetailPanelEmptyPromptProps {
  iconType: IconType;
  dataTestSubj: string;
  title: ReactNode;
}

export const AiIndexDetailPanelEmptyPrompt = ({
  iconType,
  dataTestSubj,
  title,
}: AiIndexDetailPanelEmptyPromptProps) => (
  <EuiEmptyPrompt
    iconType={iconType}
    titleSize="xs"
    data-test-subj={dataTestSubj}
    title={<h3>{title}</h3>}
  />
);
