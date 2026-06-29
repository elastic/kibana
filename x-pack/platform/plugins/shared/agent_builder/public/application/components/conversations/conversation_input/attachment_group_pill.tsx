/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/css';
import { EuiBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback } from 'react';
import type { AttachmentGroup } from '@kbn/agent-builder-common/attachments';
import { useIsAgentWorkspaceMount } from '../../../hooks/use_navigation';

const removeAttachmentGroupAriaLabel = i18n.translate(
  'xpack.agentBuilder.attachmentGroupPill.removeAriaLabel',
  {
    defaultMessage: 'Remove attachment group',
  }
);

const removePinnedItemsAriaLabel = i18n.translate(
  'xpack.agentBuilder.attachmentGroupPill.removePinnedItemsAriaLabel',
  {
    defaultMessage: 'Remove pinned items',
  }
);

const groupTypeLabel = i18n.translate('xpack.agentBuilder.attachmentGroupPill.groupTypeLabel', {
  defaultMessage: 'Group',
});

export interface AttachmentGroupPillProps {
  group: AttachmentGroup;
  onRemove?: () => void;
}

export const AttachmentGroupPill: React.FC<AttachmentGroupPillProps> = ({ group, onRemove }) => {
  const isAgentWorkspaceMount = useIsAgentWorkspaceMount();
  const removeAriaLabel = isAgentWorkspaceMount
    ? removePinnedItemsAriaLabel
    : removeAttachmentGroupAriaLabel;

  const pillLabel = `${groupTypeLabel}: ${group.label}`;

  const handleRemove = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      onRemove?.();
    },
    [onRemove]
  );

  const badgeStyles = css`
    max-width: 200px;

    .euiBadge__text {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `;

  const removableBadgeProps = onRemove
    ? {
        iconType: 'cross' as const,
        iconSide: 'right' as const,
        iconOnClick: handleRemove,
        iconOnClickAriaLabel: removeAriaLabel,
      }
    : {};

  return (
    <EuiBadge
      color="hollow"
      className={badgeStyles}
      data-test-subj={`agentBuilderAttachmentGroupPill-${group.id}`}
      {...removableBadgeProps}
    >
      {pillLabel}
    </EuiBadge>
  );
};
