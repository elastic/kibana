/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiAvatar } from '@elastic/eui';
import { UserActionTitle } from '@kbn/cases-components';
import { CASE_VIEW_PAGE_TABS } from '../../../../common';
import {
  AttachmentActionType,
  defineAttachment,
  type UnifiedReferenceAttachmentViewProps,
} from '../../../client/attachment_framework/types';
import { STACK_ALERT_ATTACHMENT_TYPE } from '../../../../common/constants/attachments';
import {
  StackAlertAttachmentPayloadSchema,
  type AlertAttachmentMetadata,
} from '../../../../common/types/domain_zod/attachment/alert/v2';
import { toStringArray } from '../../../../common/utils/attachments';
import * as i18n from './translations';
import { ShowTableButton } from '../common/show_table_button';

const StackAlertTabContentLazy = React.lazy(() =>
  import('./components/alert_tab_content').then(({ StackAlertTabContent }) => ({
    default: StackAlertTabContent,
  }))
);

type StackAlertViewProps = UnifiedReferenceAttachmentViewProps<AlertAttachmentMetadata>;

const getAttachmentViewObject = (props: StackAlertViewProps) => {
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
          targetId: metadata?.rule?.id ?? null,
          label: metadata?.rule?.name ?? null,
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

const getAttachmentRemovalObject = (props: StackAlertViewProps) => {
  const alertIds = toStringArray(props.attachmentId);
  if (alertIds.length <= 1) {
    return { event: i18n.REMOVED_ALERT_LABEL_TITLE };
  }
  return { event: i18n.REMOVED_ALERTS_LABEL_TITLE(alertIds.length) };
};

export const getStackAlertAttachmentType = () =>
  defineAttachment({
    id: STACK_ALERT_ATTACHMENT_TYPE,
    displayName: i18n.ALERT_DISPLAY_NAME,
    icon: 'bell',
    getAttachmentViewObject,
    getAttachmentRemovalObject,
    getAttachmentTabViewObject: () => ({
      children: StackAlertTabContentLazy,
    }),
    schema: StackAlertAttachmentPayloadSchema,
  });
