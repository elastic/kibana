/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiButtonIcon, EuiNotificationBadge, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useActiveConversationAttachmentCount } from '../../../hooks/use_active_conversation_attachment_count';

const labels = {
  attachments: (count: number) =>
    i18n.translate('xpack.agentBuilder.conversationHeader.attachmentCart.ariaLabel', {
      defaultMessage: '{count, plural, one {# attachment} other {# attachments}}',
      values: { count },
    }),
};

export const AttachmentCartButton: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const attachmentCount = useActiveConversationAttachmentCount();

  const badgeStyles = css`
    position: absolute;
    inset-block-start: -${euiTheme.size.xs};
    inset-inline-end: -${euiTheme.size.xs};
    pointer-events: none;
  `;

  return (
    <EuiToolTip content={labels.attachments(attachmentCount)} position="bottom">
      <div
        css={css`
          position: relative;
          display: inline-flex;
        `}
      >
        <EuiButtonIcon
          color="text"
          iconType="paperClip"
          aria-label={labels.attachments(attachmentCount)}
          data-test-subj="agentBuilderAttachmentCartButton"
        />
        {attachmentCount > 0 ? (
          <EuiNotificationBadge
            css={badgeStyles}
            color="accent"
            data-test-subj="agentBuilderAttachmentCartBadge"
          >
            {attachmentCount}
          </EuiNotificationBadge>
        ) : null}
      </div>
    </EuiToolTip>
  );
};
