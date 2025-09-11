/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlyout, EuiFlyoutHeader, EuiTitle, EuiFlyoutBody } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const roundResultsFlyoutTitle = i18n.translate(
  'xpack.onechat.conversation.roundResultsFlyout.title',
  {
    defaultMessage: 'Tool call results',
  }
);

interface RoundResultsFlyoutProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const RoundResultsFlyout: React.FC<RoundResultsFlyoutProps> = ({
  isOpen,
  onClose,
  children,
}) => {
  if (!isOpen) return null;

  return (
    <EuiFlyout onClose={onClose} aria-labelledby="rawResponseFlyoutTitle" size="m">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="rawResponseFlyoutTitle">{roundResultsFlyoutTitle}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>{children}</EuiFlyoutBody>
    </EuiFlyout>
  );
};
