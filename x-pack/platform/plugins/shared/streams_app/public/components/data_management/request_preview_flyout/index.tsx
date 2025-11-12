/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiCodeBlock,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface HttpRequestPreview {
  method: string;
  url: string;
  body: unknown;
}

interface RequestPreviewFlyoutProps {
  request: HttpRequestPreview;
  onClose: () => void;
  prependBasePath: (path: string) => string;
  title?: string;
  description?: string;
  urlLabel?: string;
  bodyLabel?: string;
}

export const RequestPreviewFlyout = ({
  request,
  onClose,
  prependBasePath,
  title = defaultTitle,
  description = defaultDescription,
  urlLabel = defaultUrlLabel,
  bodyLabel = defaultBodyLabel,
}: RequestPreviewFlyoutProps) => {
  const fullUrl = prependBasePath(request.url);
  const requestBody =
    typeof request.body === 'string' ? request.body : JSON.stringify(request.body, null, 2);

  return (
    <EuiFlyout
      onClose={onClose}
      size="m"
      maxWidth={600}
      aria-labelledby="streamsRequestPreviewFlyoutTitle"
      ownFocus
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="streamsRequestPreviewFlyoutTitle">{title}</h2>
        </EuiTitle>
        <EuiText color="subdued" size="s">
          {description}
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiText size="s">
          <strong>{urlLabel}</strong>
        </EuiText>
        <EuiSpacer size="s" />
        <EuiCodeBlock language="http" isCopyable aria-label={urlLabel}>
          {`${request.method} ${fullUrl}`}
        </EuiCodeBlock>
        <EuiSpacer size="m" />
        <EuiText size="s">
          <strong>{bodyLabel}</strong>
        </EuiText>
        <EuiSpacer size="s" />
        <EuiCodeBlock language="json" isCopyable aria-label={bodyLabel}>
          {requestBody}
        </EuiCodeBlock>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};

const defaultTitle = i18n.translate(
  'xpack.streams.requestPreviewFlyout.defaultTitle',
  { defaultMessage: 'Save request payload' }
);

const defaultDescription = i18n.translate(
  'xpack.streams.requestPreviewFlyout.defaultDescription',
  {
    defaultMessage:
      'Use this API request in scripts or automation to persist the configured changes.',
  }
);

const defaultUrlLabel = i18n.translate(
  'xpack.streams.requestPreviewFlyout.defaultUrlLabel',
  { defaultMessage: 'Request URL' }
);

const defaultBodyLabel = i18n.translate(
  'xpack.streams.requestPreviewFlyout.defaultBodyLabel',
  { defaultMessage: 'Request body' }
);
