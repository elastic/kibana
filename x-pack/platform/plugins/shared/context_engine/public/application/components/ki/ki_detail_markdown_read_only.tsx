/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiMarkdownFormat, EuiPanel } from '@elastic/eui';
import React from 'react';

interface KiDetailMarkdownReadOnlyProps {
  content: string;
}

export const KiDetailMarkdownReadOnly = ({ content }: KiDetailMarkdownReadOnlyProps) => (
  <EuiPanel
    hasBorder
    paddingSize="l"
    style={{ height: '100%' }}
    data-test-subj="contextKiDetailContent"
  >
    <div data-test-subj="contextKiDetailMarkdownRendered">
      <EuiMarkdownFormat textSize="s">{content}</EuiMarkdownFormat>
    </div>
  </EuiPanel>
);
