/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useState } from 'react';
import { useConversationContext } from '../../../../context/conversation/conversation_context';
import { useAttachmentPanel } from '../../../../context/attachment_panel/attachment_panel_context';
import { AttachmentPanelContent } from '../../attachment_panel/attachment_panel_content';

const styles = css`
  width: 100%;
  border: 3px solid green;
  border-radius: 4px;
  padding: 32px;
  margin: 16px 0;
`;

export const FakeAttachment = ({ attachmentId }: { attachmentId: string }) => {
  const { openPanel } = useAttachmentPanel();
  const { isEmbeddedContext } = useConversationContext();
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);

  const onClick = useCallback(() => {
    if (isEmbeddedContext) {
      // open flyout in embedded context
      setIsFlyoutOpen(true);
    } else {
      // open split panel in full-screen
      openPanel(attachmentId);
    }
  }, [isEmbeddedContext, openPanel, attachmentId]);

  return (
    <>
      <EuiFlexGroup direction="row" justifyContent="spaceBetween" css={styles}>
        <EuiFlexItem grow={false}>
          <EuiText>
            <h3>Inline Attachment Actions (1)</h3>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup>
            <EuiButton color="text" size="s">
              Secondary
            </EuiButton>
            <EuiButton color="primary" size="s" onClick={onClick}>
              Preview
            </EuiButton>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup
        css={css`
          width: 100%;
          height: 400px;
          border: 3px solid green;
          border-radius: 4px;
          display: flex;
          justify-content: center;
          align-items: center;
        `}
      >
        <EuiText>
          <h3>Inline Attachment (2) - {attachmentId}</h3>
        </EuiText>
      </EuiFlexGroup>
      {isFlyoutOpen && (
        <EuiFlyout
          aria-labelledby="attachmentPanelContent"
          onClose={() => setIsFlyoutOpen(false)}
          size="m"
          css={css`
            border: 3px solid green;
          `}
        >
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="m">
              <h2>Canvas Mode (Flyout)</h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <AttachmentPanelContent attachmentId={attachmentId} />
          </EuiFlyoutBody>
        </EuiFlyout>
      )}
    </>
  );
};
