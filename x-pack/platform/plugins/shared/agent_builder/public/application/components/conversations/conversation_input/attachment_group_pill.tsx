/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { AttachmentGroup } from '@kbn/agent-builder-common/attachments';

const removeAriaLabel = i18n.translate('xpack.agentBuilder.attachmentGroupPill.removeAriaLabel', {
  defaultMessage: 'Remove attachment group',
});

export interface AttachmentGroupPillProps {
  group: AttachmentGroup;
  onRemove?: () => void;
}

export const AttachmentGroupPill: React.FC<AttachmentGroupPillProps> = ({ group, onRemove }) => {
  if (onRemove) {
    return (
      <EuiBadge
        color="hollow"
        data-test-subj={`agentBuilderAttachmentGroupPill-${group.id}`}
        iconType="cross"
        iconSide="right"
        iconOnClick={onRemove}
        iconOnClickAriaLabel={removeAriaLabel}
      >
        {group.label}
      </EuiBadge>
    );
  }

  return (
    <EuiBadge color="hollow" data-test-subj={`agentBuilderAttachmentGroupPill-${group.id}`}>
      {group.label}
    </EuiBadge>
  );
};
