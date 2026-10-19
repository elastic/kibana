/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { SnakeToCamelCase } from '../../../common/types';
import type { BulkAttachmentsUserAction } from '../../../common/types/domain';
import type { UnifiedAttachmentTypeRegistry } from '../../client/attachment_framework/unified_attachment_registry';
import type { UserActionBuilder } from './types';
import { createCommonUpdateUserActionBuilder } from './common';

const getLabel = (
  unifiedAttachmentTypeRegistry: UnifiedAttachmentTypeRegistry,
  attachmentType: string,
  count: number
): React.ReactNode => {
  if (!unifiedAttachmentTypeRegistry.has(attachmentType)) {
    return (
      <FormattedMessage
        id="xpack.cases.caseView.userActions.bulkAttachmentsRemovedUnknownTypeLabel"
        defaultMessage="removed {count, plural, one {# attachment} other {# attachments}}"
        values={{ count }}
      />
    );
  }

  return (
    <FormattedMessage
      id="xpack.cases.caseView.userActions.bulkAttachmentsRemovedLabel"
      defaultMessage="removed {count, plural, one {# attachment} other {# attachments}} from {section}"
      values={{ count, section: unifiedAttachmentTypeRegistry.get(attachmentType).getLabel() }}
    />
  );
};

export const createBulkAttachmentsUserActionBuilder: UserActionBuilder = ({
  userAction,
  userProfiles,
  handleOutlineComment,
  unifiedAttachmentTypeRegistry,
}) => ({
  build: () => {
    const action = userAction as SnakeToCamelCase<BulkAttachmentsUserAction>;
    const { attachmentType, count } = action.payload.bulkAttachments;

    if (count <= 0) {
      return [];
    }

    const label = (
      <EuiText size="s" data-test-subj="bulk-attachments-action">
        {getLabel(unifiedAttachmentTypeRegistry, attachmentType, count)}
      </EuiText>
    );

    return createCommonUpdateUserActionBuilder({
      userProfiles,
      userAction,
      handleOutlineComment,
      label,
      icon: 'cross',
    }).build();
  },
});
