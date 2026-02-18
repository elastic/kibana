/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldText,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useEffect, useState } from 'react';
import { useConversationContext } from '../../../../context/conversation/conversation_context';
import { useAttachmentPanel } from '../../../../context/attachment_panel/attachment_panel_context';
import { AttachmentPanelContent } from '../../attachment_panel/attachment_panel_content';

export const FakeAttachment = ({
  attachmentId,
  title,
}: {
  attachmentId: string;
  title?: string;
}) => {
  const { euiTheme } = useEuiTheme();
  const { openPanel, registerAttachment, setTempTitle, tempTitles } = useAttachmentPanel();

  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [renameInputValue, setRenameInputValue] = useState('');

  const styles = css`
    width: 100%;
    border: 2px solid ${euiTheme.colors.borderBaseSubdued};
    border-radius: 4px;
    padding: 16px;
    margin: 16px 0;
  `;
  const { isEmbeddedContext } = useConversationContext();
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);

  // Register this attachment on mount so the navigator knows about it
  // even before the user clicks "Preview"
  useEffect(() => {
    registerAttachment(attachmentId, title);
  }, [registerAttachment, attachmentId, title]);

  const openRenameModal = useCallback(() => {
    setRenameInputValue(tempTitles[attachmentId] ?? '');
    setIsRenameModalOpen(true);
  }, [attachmentId, tempTitles]);

  const closeRenameModal = useCallback(() => {
    setIsRenameModalOpen(false);
  }, []);

  const saveTempTitle = useCallback(() => {
    setTempTitle(attachmentId, renameInputValue.trim());
    closeRenameModal();
  }, [attachmentId, renameInputValue, setTempTitle, closeRenameModal]);

  const onClick = useCallback(() => {
    if (isEmbeddedContext) {
      // open flyout in embedded context
      setIsFlyoutOpen(true);
    } else {
      // open split panel in full-screen
      openPanel(attachmentId, title);
    }
  }, [isEmbeddedContext, openPanel, attachmentId, title]);

  return (
    <div data-attachment-id={attachmentId}>
      <EuiFlexGroup direction="row" alignItems="center" justifyContent="spaceBetween" css={styles}>
        <EuiFlexItem grow={false}>
          <EuiText
            size="s"
            css={css`
              cursor: pointer;
              &:hover {
                text-decoration: underline;
              }
            `}
            onClick={openRenameModal}
          >
            Inline Attachment Actions (1)
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
          border: 2px solid ${euiTheme.colors.borderBaseSubdued};
          border-radius: 4px;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 16px;
        `}
      >
        <EuiText size="s">
          <h3>Inline Attachment (2) - {tempTitles[attachmentId] || attachmentId}</h3>
        </EuiText>
      </EuiFlexGroup>
      {isRenameModalOpen && (
        <EuiModal onClose={closeRenameModal}>
          <EuiModalHeader>
            <EuiTitle size="s">
              <h2>Rename attachment</h2>
            </EuiTitle>
          </EuiModalHeader>
          <EuiModalBody>
            <EuiFieldText
              placeholder="Enter a name for this attachment"
              value={renameInputValue}
              onChange={(e) => setRenameInputValue(e.target.value)}
              fullWidth
              data-test-subj="attachmentRenameInput"
            />
          </EuiModalBody>
          <EuiModalFooter>
            <EuiButtonEmpty onClick={closeRenameModal}>Cancel</EuiButtonEmpty>
            <EuiButton onClick={saveTempTitle} fill>
              Save
            </EuiButton>
          </EuiModalFooter>
        </EuiModal>
      )}
      {isFlyoutOpen && (
        <EuiFlyout
          aria-labelledby="attachmentPanelContent"
          onClose={() => setIsFlyoutOpen(false)}
          size="m"
          css={css`
            border: 2px solid ${euiTheme.colors.borderBaseSubdued};
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
    </div>
  );
};
