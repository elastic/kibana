/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { z } from '@kbn/zod/v4';
import { EuiAvatar } from '@elastic/eui';
import { UserActionTitle } from '@kbn/cases-components';
import { CASE_VIEW_PAGE_TABS } from '../../../../common';
import { AttachmentActionType } from '../../../client/attachment_framework/types';
import type {
  UnifiedReferenceAttachmentType,
  UnifiedReferenceAttachmentViewProps,
} from '../../../client/attachment_framework/types';
import { STACK_ALERT_ATTACHMENT_TYPE } from '../../../../common/constants/attachments';
import { toStringArray } from '../../../../common/utils/attachments';
import * as i18n from './translations';
import { ShowTableButton } from '../common/show_table_button';

const StackAlertTabContentLazy = React.lazy(() =>
  import('./components/alert_tab_content').then(({ StackAlertTabContent }) => ({
    default: StackAlertTabContent,
  }))
);

const StackAlertAttachmentMetadataRt = z.object({
  index: z.union([z.string(), z.array(z.string())]).optional(),
  rule: z
    .union([
      z.null(),
      z.object({
        id: z.string().nullable().optional(),
        name: z.string().nullable().optional(),
      }),
    ])
    .optional(),
});

const stackAlertSchemaValidator = (metadata: unknown): void => {
  StackAlertAttachmentMetadataRt.parse(metadata ?? {});
};

const getAttachmentViewObject = (props: UnifiedReferenceAttachmentViewProps) => {
  const { savedObjectId, attachmentId, metadata } = props;
  const alertIds = toStringArray(attachmentId);
  const totalAlerts = alertIds.length;
  const singleAlert = totalAlerts === 1;

  const label = singleAlert
    ? i18n.ALERT_COMMENT_LABEL_TITLE
    : i18n.MULTIPLE_ALERTS_COMMENT_LABEL_TITLE(totalAlerts);

  return {
    eventColor: 'subdued' as const,
    event: (
      <UserActionTitle
        label={label}
        link={{
          targetId: (metadata?.rule as { id?: string | null } | undefined)?.id ?? null,
          label: (metadata?.rule as { name?: string | null } | undefined)?.name ?? null,
          fallbackLabel: i18n.UNKNOWN_RULE,
          dataTestSubj: `alert-rule-link-${savedObjectId}`,
        }}
        dataTestSubj={`alerts-user-action-${savedObjectId}`}
      />
    ),
    timelineAvatar: (
      <EuiAvatar
        name="alert"
        color="subdued"
        iconType="bell"
        aria-label={i18n.ALERT_AVATAR_ARIA_LABEL}
      />
    ),
    getActions: () => [
      {
        type: AttachmentActionType.CUSTOM as const,
        isPrimary: true,
        render: () => <ShowTableButton tabId={CASE_VIEW_PAGE_TABS.ALERTS} />,
      },
    ],
    deleteSuccessTitle: i18n.DELETE_ALERTS_SUCCESS_TITLE(Math.max(totalAlerts, 1)),
  };
};

const getAttachmentRemovalObject = (props: UnifiedReferenceAttachmentViewProps) => {
  const alertIds = toStringArray(props.attachmentId);
  if (alertIds.length <= 1) {
    return { event: i18n.REMOVED_ALERT_LABEL_TITLE };
  }
  return { event: i18n.REMOVED_ALERTS_LABEL_TITLE(alertIds.length) };
};

export const getStackAlertAttachmentType = (): UnifiedReferenceAttachmentType => ({
  id: STACK_ALERT_ATTACHMENT_TYPE,
  displayName: i18n.ALERT_DISPLAY_NAME,
  icon: 'bell',
  getAttachmentViewObject,
  getAttachmentRemovalObject,
  getAttachmentTabViewObject: () => ({
    children: StackAlertTabContentLazy,
  }),
  schemaValidator: stackAlertSchemaValidator,
});
