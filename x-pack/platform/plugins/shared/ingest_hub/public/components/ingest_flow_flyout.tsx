/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiTitle,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { IngestFlow } from '../types';

interface IngestFlowFlyoutProps {
  flow: IngestFlow;
  onClose: () => void;
}

export const IngestFlowFlyout: React.FC<IngestFlowFlyoutProps> = ({ flow, onClose }) => {
  const flyoutTitleId = useGeneratedHtmlId({ prefix: 'ingestFlowFlyout' });
  const { component: Content, title, description, icon } = flow;

  return (
    <EuiFlyout onClose={onClose} size="m" aria-labelledby={flyoutTitleId} ownFocus>
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type={icon} size="l" aria-hidden={true} />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="m">
              <h2 id={flyoutTitleId}>{title}</h2>
            </EuiTitle>
            <EuiText size="s" color="subdued">
              {description}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <Content />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
