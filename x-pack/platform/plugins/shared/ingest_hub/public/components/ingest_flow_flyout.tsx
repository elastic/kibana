/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useMemo } from 'react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiTitle,
  EuiText,
  EuiLoadingSpinner,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { IngestFlowRegistration } from '../types';

interface IngestFlowFlyoutProps {
  flow: IngestFlowRegistration;
  onClose: () => void;
}

const LoadingSpinner: React.FC = () => (
  <EuiFlexGroup justifyContent="center" alignItems="center">
    <EuiFlexItem grow={false}>
      <EuiLoadingSpinner size="l" />
    </EuiFlexItem>
  </EuiFlexGroup>
);

export const IngestFlowFlyout: React.FC<IngestFlowFlyoutProps> = ({ flow, onClose }) => {
  const flyoutTitleId = useGeneratedHtmlId({ prefix: 'ingestFlowFlyout' });
  const LazyContent = useMemo(
    () => React.lazy(async () => ({ default: await flow.getComponent() })),
    [flow]
  );

  return (
    <EuiFlyout onClose={onClose} size="m" aria-labelledby={flyoutTitleId} ownFocus>
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type={flow.icon} size="l" aria-hidden={true} />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="m">
              <h2 id={flyoutTitleId}>{flow.title}</h2>
            </EuiTitle>
            <EuiText size="s" color="subdued">
              {flow.description}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <Suspense fallback={<LoadingSpinner />}>
          <LazyContent />
        </Suspense>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
