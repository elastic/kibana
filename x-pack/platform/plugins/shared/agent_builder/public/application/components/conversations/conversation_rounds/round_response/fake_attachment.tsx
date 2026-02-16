/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { useAttachmentPanel } from '../../../../context/attachment_panel/attachment_panel_context';

const styles = css`
  width: 100%;
  border: 3px solid red;
  border-radius: 4px;
  padding: 32px;
  margin: 16px 0;
`;

export const FakeAttachment = ({ attachmentId }: { attachmentId: string }) => {
  const { openPanel } = useAttachmentPanel();

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
            <EuiButton color="primary" size="s" onClick={() => openPanel(attachmentId)}>
              Preview
            </EuiButton>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup
        css={css`
          width: 100%;
          height: 400px;
          border: 3px solid red;
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
    </>
  );
};
