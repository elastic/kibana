/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { labels } from './translations';
import { McpClientLogo } from './mcp_client_logo';
import {
  McpClientDetailsContent,
  type McpClientDetailsData,
  type McpClientDetailsPresentation,
} from './mcp_client_details_content';

export interface McpClientDetailsProps {
  clientDetails: McpClientDetailsData;
  presentation: McpClientDetailsPresentation;
  onClose: () => void;
}

export const McpClientDetails = ({
  clientDetails,
  presentation,
  onClose,
}: McpClientDetailsProps) => {
  const modalTitleId = useGeneratedHtmlId({ prefix: 'mcpClientDetailsModalTitle' });
  const flyoutTitleId = useGeneratedHtmlId({ prefix: 'mcpClientDetailsFlyoutTitle' });

  const clientName = clientDetails.client_name ?? clientDetails.id;

  if (presentation === 'flyout') {
    return (
      <EuiFlyout
        onClose={onClose}
        size="m"
        aria-labelledby={flyoutTitleId}
        data-test-subj="mcpClientDetailsFlyout"
      >
        <EuiFlyoutHeader hasBorder>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <McpClientLogo clientLogo={clientDetails.client_logo} size="l" />
            <EuiTitle size="m">
              <h2 id={flyoutTitleId}>{clientName}</h2>
            </EuiTitle>
          </EuiFlexGroup>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <EuiTitle size="xs">
            <h3>{labels.details.flyout.serverDetailsHeading}</h3>
          </EuiTitle>
          <EuiSpacer size="l" />
          <McpClientDetailsContent clientDetails={clientDetails} presentation="flyout" />
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="flexEnd" responsive={false}>
            <EuiButton onClick={onClose} data-test-subj="mcpClientDetailsCloseButton">
              {labels.details.closeButton}
            </EuiButton>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    );
  }

  return (
    <EuiModal
      aria-labelledby={modalTitleId}
      onClose={onClose}
      data-test-subj="mcpClientDetailsModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          {labels.details.modal.title(clientName)}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiText size="s" color="subdued">
          {labels.details.modal.description}
        </EuiText>
        <EuiSpacer size="l" />
        <McpClientDetailsContent clientDetails={clientDetails} presentation="modal" />
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButton onClick={onClose} fill data-test-subj="mcpClientDetailsCloseButton">
          {labels.details.closeButton}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
