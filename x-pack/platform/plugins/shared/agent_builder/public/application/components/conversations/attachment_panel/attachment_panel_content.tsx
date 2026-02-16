/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';

interface AttachmentPanelContentProps {
  attachmentId?: string;
}

export const AttachmentPanelContent: React.FC<AttachmentPanelContentProps> = ({ attachmentId }) => {
  return (
    <EuiText>
      <p>Attachment ID: {attachmentId || 'No attachment selected'}</p>
    </EuiText>
  );
};
