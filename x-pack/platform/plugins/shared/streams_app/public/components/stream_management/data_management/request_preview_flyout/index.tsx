/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCodeBlock,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

interface RequestPreviewFlyoutProps {
  codeContent: string;
  title?: string;
  description?: string;
  onClose: () => void;
}

export const RequestPreviewFlyout = ({
  codeContent,
  title = defaultTitle,
  description = defaultDescription,
  onClose,
}: RequestPreviewFlyoutProps) => {
  return (
    <EuiFlyout
      data-test-subj="streamsRequestCodePreviewFlyout"
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
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiText>
              <p>{description}</p>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              aria-label={downloadAriaLabel}
              display="base"
              size="m"
              download="streams-request.txt"
              href={`data:text/plain;charset=utf-8,${encodeURIComponent(codeContent)}`}
              iconType="download"
            />
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="m" />

        <EuiCodeBlock data-test-subj="streamsRequestCodePreviewFlyoutCodeBlock" isCopyable>
          {codeContent}
        </EuiCodeBlock>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose}>{closeButtonLabel}</EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiCopy textToCopy={codeContent}>
              {(copy) => (
                <EuiButton onClick={copy} fill>
                  {copyButtonLabel}
                </EuiButton>
              )}
            </EuiCopy>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

const defaultTitle = i18n.translate('xpack.streams.requestPreviewFlyout.defaultTitle', {
  defaultMessage: 'Equivalent API Request',
});

const defaultDescription = i18n.translate('xpack.streams.requestPreviewFlyout.defaultDescription', {
  defaultMessage: 'Use the REST API with the following request.',
});

const downloadAriaLabel = i18n.translate(
  'xpack.streams.requestPreviewFlyout.downloadButtonAriaLabel',
  {
    defaultMessage: 'Download request as a file',
  }
);

const closeButtonLabel = i18n.translate(
  'xpack.streams.requestPreviewFlyout.closeButtonEmptyLabel',
  {
    defaultMessage: 'Close',
  }
);

const copyButtonLabel = i18n.translate('xpack.streams.requestPreviewFlyout.copyButtonLabel', {
  defaultMessage: 'Copy to clipboard',
});
