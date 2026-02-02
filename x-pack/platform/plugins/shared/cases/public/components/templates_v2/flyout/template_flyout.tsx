/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlyout, EuiFlyoutBody, EuiFlyoutHeader, EuiTitle } from '@elastic/eui';
import { noop } from 'lodash';

export interface TemplateFlyoutProps {
  onClose?: () => void;
}

export const TemplateFlyout = React.memo<TemplateFlyoutProps>(({ onClose }) => {
  const handleClose = onClose || noop;

  return (
    <EuiFlyout onClose={handleClose} aria-label="Template flyout" data-test-subj="template-flyout">
      <EuiFlyoutHeader data-test-subj="template-flyout-header" hasBorder>
        <EuiTitle size="m">
          <h2>{'Template'}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>{/* Empty flyout body */}</EuiFlyoutBody>
    </EuiFlyout>
  );
});

TemplateFlyout.displayName = 'TemplateFlyout';
