/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { useAttachmentPanel } from '../../../context/attachment_panel/attachment_panel_context';

interface AttachmentPanelContentProps {
  attachmentId?: string;
}

export const AttachmentPanelContent: React.FC<AttachmentPanelContentProps> = ({ attachmentId }) => {
  const { tempTitles } = useAttachmentPanel();
  const tempTitle = attachmentId ? tempTitles[attachmentId] : undefined;

  return (
    <EuiText>
      <p>
        Attachment ID: 
        {tempTitle && ` ${tempTitle}`}
      </p>
    </EuiText>
  );
};
