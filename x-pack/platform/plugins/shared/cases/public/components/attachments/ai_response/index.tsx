/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiMarkdownFormat, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AttachmentType } from '../../../client/attachment_framework/types';
import { AI_RESPONSE_ATTACHMENT_TYPE } from '../../../../common/types/domain_zod/attachment/ai_response/v1';
import type { AiResponseAttachmentData } from '../../../../common/types/domain_zod/attachment/ai_response/v1';

const displayName = i18n.translate('xpack.cases.aiResponse.attachment.displayName', {
  defaultMessage: 'AI assistant',
});

export const aiResponseAttachmentType: AttachmentType<{ attachment: { data: AiResponseAttachmentData } }> =
  {
    id: AI_RESPONSE_ATTACHMENT_TYPE,
    icon: 'sparkles',
    displayName,
    getAttachmentViewObject: ({ attachment }) => ({
      event: displayName,
      children: (
        <EuiText size="s">
          <EuiMarkdownFormat>{attachment.data.content}</EuiMarkdownFormat>
        </EuiText>
      ),
    }),
  };
