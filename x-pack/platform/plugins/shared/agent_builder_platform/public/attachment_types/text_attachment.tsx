/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiCodeBlock } from '@elastic/eui';
import { css } from '@emotion/react';
import type { TextAttachment } from '@kbn/agent-builder-common/attachments';
import {
  ActionButtonType,
  type AttachmentUIDefinition,
  type AttachmentRenderProps,
} from '@kbn/agent-builder-browser/attachments';

const codeBlockStyles = css`
  width: 100%;
  & pre {
    margin-block-end: 0;
  }
`;

const TextInlineContent: React.FC<AttachmentRenderProps<TextAttachment>> = ({ attachment }) => (
  <EuiCodeBlock language="text" fontSize="s" overflowHeight={300} css={codeBlockStyles}>
    {attachment.data.content}
  </EuiCodeBlock>
);

/**
 * UI definition for text attachments
 */
export const textAttachmentDefinition: AttachmentUIDefinition<TextAttachment> = {
  getLabel: () =>
    i18n.translate('xpack.agentBuilderPlatform.attachments.text.label', {
      defaultMessage: 'Text',
    }),
  getIcon: () => 'document',
  renderInlineContent: (props) => <TextInlineContent {...props} />,
  getActionButtons: ({ attachment }) => [
    {
      label: i18n.translate('xpack.agentBuilderPlatform.attachments.text.copy', {
        defaultMessage: 'Copy',
      }),
      icon: 'copy',
      type: ActionButtonType.PRIMARY,
      handler: async () => {
        await navigator.clipboard.writeText(attachment.data.content);
      },
    },
  ],
};
