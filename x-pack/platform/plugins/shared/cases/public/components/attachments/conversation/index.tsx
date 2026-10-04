/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { AGENT_BUILDER_CONVERSATION_ATTACHMENT_TYPE } from '../../../../common/constants/attachments';
import { ConversationAttachmentPayloadSchema } from '../../../../common/types/domain_zod/attachment/conversation/v2';
import {
  defineAttachment,
  type CommonAttachmentListViewProps,
} from '../../../client/attachment_framework/types';
import { ConversationEvent, type ConversationViewProps } from './conversation_event';
import * as i18n from './translations';

const ConversationAttachmentsTableLazy = React.lazy(async () => {
  const { ConversationAttachmentsTable } = await import('./conversation_attachments_table');
  return { default: ConversationAttachmentsTable };
});

const ConversationAttachmentsTab: React.FC<CommonAttachmentListViewProps> = (props) => (
  <Suspense fallback={<EuiLoadingSpinner size="m" />}>
    <ConversationAttachmentsTableLazy {...props} />
  </Suspense>
);
ConversationAttachmentsTab.displayName = 'ConversationAttachmentsTab';

export const getConversationAttachmentType = () =>
  defineAttachment({
    id: AGENT_BUILDER_CONVERSATION_ATTACHMENT_TYPE,
    getIcon: () => 'productAgent',
    getLabel: () => i18n.CONVERSATIONS,
    schema: ConversationAttachmentPayloadSchema,
    getCreationActivity: (props: ConversationViewProps) => ({
      eventColor: 'subdued' as const,
      event: <ConversationEvent {...props} />,
      hideDefaultActions: false,
      deleteSuccessToast: i18n.DELETE_CONVERSATION_SUCCESS_TOAST,
    }),
    getRemovalActivity: () => ({ event: i18n.REMOVED_CONVERSATION }),
    getAttachmentList: () => ({ children: ConversationAttachmentsTab }),
  });
