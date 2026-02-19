/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSplitPanel } from '@elastic/eui';

interface InlineAttachmentContentProps {
  children: React.ReactNode;
}

export const InlineAttachmentContent: React.FC<InlineAttachmentContentProps> = ({ children }) => {
  return (
    <EuiSplitPanel.Inner grow={false} paddingSize="none">
      {children}
    </EuiSplitPanel.Inner>
  );
};
