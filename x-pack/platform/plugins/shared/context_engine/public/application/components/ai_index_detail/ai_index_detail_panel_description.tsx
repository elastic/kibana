/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer, EuiText } from '@elastic/eui';
import React, { type ReactNode } from 'react';

interface AiIndexDetailPanelDescriptionProps {
  children: ReactNode;
  'data-test-subj'?: string;
}

export const AiIndexDetailPanelDescription = ({
  children,
  'data-test-subj': dataTestSubj,
}: AiIndexDetailPanelDescriptionProps) => (
  <>
    <EuiSpacer size="xs" />
    <EuiText size="xs" color="subdued" data-test-subj={dataTestSubj}>
      <p>{children}</p>
    </EuiText>
  </>
);
