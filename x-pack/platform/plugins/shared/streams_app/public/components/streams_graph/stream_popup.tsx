/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPopover, EuiPopoverTitle, EuiText, EuiSpacer} from '@elastic/eui';
import type { Streams } from '@kbn/streams-schema';

interface StreamNodePopupProps {
  isOpen: boolean;
  onClose: () => void;
  stream: Streams.WiredStream.Definition;
  button: React.ReactElement;
}

export const StreamNodePopover = ({ isOpen, onClose, stream, button }: StreamNodePopupProps) => {
  return (
    <EuiPopover
      button={button}
      isOpen={isOpen}
      closePopover={onClose}
      anchorPosition="upCenter"
    >
      <EuiPopoverTitle>
        {stream.name}
      </EuiPopoverTitle>
      <EuiSpacer size="xs" />
      {stream.description && <EuiText size="s" color="subdued">
        {stream.description}
      </EuiText>}
    </EuiPopover>
  );
};