/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { CASE_LINK_ATTACHMENT_TYPE } from '../../../../common/constants/attachments';
import { CaseLinkAttachmentPayloadSchema } from '../../../../common/types/domain/attachment/case_link/v1';
import { defineAttachment } from '../../../client/attachment_framework/types';
import { CaseLinkEvent, type CaseLinkViewProps } from './case_link_event';
import * as i18n from './translations';

export const getCaseLinkAttachmentType = () =>
  defineAttachment({
    id: CASE_LINK_ATTACHMENT_TYPE,
    getIcon: () => 'link',
    getLabel: () => i18n.LINKED_CASES,
    schema: CaseLinkAttachmentPayloadSchema,
    getCreationActivity: (props: CaseLinkViewProps) => ({
      eventColor: 'subdued' as const,
      event: <CaseLinkEvent {...props} />,
      hideDefaultActions: true,
    }),
    getRemovalActivity: () => ({ event: i18n.UNLINKED_CASE }),
  });
