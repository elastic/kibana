/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
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

export const IngestFlowFlyout: React.FC<IngestFlowFlyoutProps> = ({ flow, onClose }) => {
  const [mountElement, setMountElement] = useState<HTMLDivElement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const flyoutTitleId = useGeneratedHtmlId({ prefix: 'ingestFlowFlyout' });

  const mountCallbackRef = useCallback((node: HTMLDivElement | null) => {
    setMountElement(node);
  }, []);

  useEffect(() => {
    if (!mountElement) {
      return;
    }

    let unmount: (() => void) | null = null;
    let cancelled = false;

    flow.mount({ element: mountElement, flowId: flow.id, onClose }).then((unmountFn) => {
      if (cancelled) {
        unmountFn();
      } else {
        unmount = unmountFn;
        setIsLoading(false);
      }
    });

    return () => {
      cancelled = true;
      unmount?.();
    };
  }, [mountElement, flow, onClose]);

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
        {isLoading && (
          <EuiFlexGroup justifyContent="center" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="l" />
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
        <div ref={mountCallbackRef} />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
