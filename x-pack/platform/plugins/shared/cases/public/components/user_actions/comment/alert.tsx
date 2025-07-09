/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { get, isEmpty } from 'lodash';
import type { EuiCommentProps } from '@elastic/eui';
import { EuiFlexItem } from '@elastic/eui';
import { ALERT_RULE_NAME, ALERT_RULE_UUID } from '@kbn/rule-data-utils';

import type { AlertAttachment } from '../../../../common/types/domain';
import type { UserActionBuilder, UserActionBuilderArgs } from '../types';
import { UserActionTimestamp } from '../timestamp';
import type { SnakeToCamelCase } from '../../../../common/types';
import { MultipleAlertsCommentEvent, SingleAlertCommentEvent } from './alert_event';
import { UserActionShowAlert } from './show_alert';
import { ShowAlertTableLink } from './show_alert_table_link';
import { HoverableUserWithAvatarResolver } from '../../user_profiles/hoverable_user_with_avatar_resolver';
import { UserActionContentToolbar } from '../content_toolbar';
import { AlertPropertyActions } from '../property_actions/alert_property_actions';
import { DELETE_ALERTS_SUCCESS_TITLE } from './translations';
import { HoverableAssistantTitleWithAvatar } from '../../assistant';

type BuilderArgs = Pick<
  UserActionBuilderArgs,
  | 'userAction'
  | 'alertData'
  | 'getRuleDetailsHref'
  | 'onRuleDetailsClick'
  | 'loadingAlertData'
  | 'onShowAlertDetails'
  | 'userProfiles'
  | 'handleDeleteComment'
  | 'loadingCommentIds'
> & { attachment: SnakeToCamelCase<AlertAttachment> };

const getSingleAlertUserAction = ({
  userAction,
  userProfiles,
  attachment,
  alertData,
  loadingAlertData,
  loadingCommentIds,
  getRuleDetailsHref,
  onRuleDetailsClick,
  onShowAlertDetails,
  handleDeleteComment,
}: BuilderArgs): EuiCommentProps[] => {
  const alertId = getNonEmptyField(attachment.alertId);
  const alertIndex = getNonEmptyField(attachment.index);

  if (!alertId || !alertIndex) {
    return [];
  }

  const alertField: unknown | undefined = alertData[alertId];
  const ruleId = getRuleId(attachment, alertField);
  const ruleName = getRuleName(attachment, alertField);

  return [
    {
      username: userAction.isAssistant ? (
        <HoverableAssistantTitleWithAvatar />
      ) : (
        <HoverableUserWithAvatarResolver user={userAction.createdBy} userProfiles={userProfiles} />
      ),
      eventColor: 'subdued',
      event: (
        <SingleAlertCommentEvent
          actionId={userAction.id}
          getRuleDetailsHref={getRuleDetailsHref}
          loadingAlertData={loadingAlertData}
          onRuleDetailsClick={onRuleDetailsClick}
          ruleId={ruleId}
          ruleName={ruleName}
        />
      ),
      'data-test-subj': `user-action-alert-${userAction.type}-${userAction.action}-action-${userAction.id}`,
      timestamp: <UserActionTimestamp createdAt={userAction.createdAt} />,
      timelineAvatar: 'bell',
      actions: (
        <UserActionContentToolbar id={attachment.id}>
          <EuiFlexItem grow={false}>
            <UserActionShowAlert
              id={userAction.id}
              alertId={alertId}
              index={alertIndex}
              onShowAlertDetails={onShowAlertDetails}
            />
          </EuiFlexItem>
          <AlertPropertyActions
            onDelete={() => handleDeleteComment(attachment.id, DELETE_ALERTS_SUCCESS_TITLE(1))}
            isLoading={loadingCommentIds.includes(attachment.id)}
            totalAlerts={1}
          />
        </UserActionContentToolbar>
      ),
    },
  ];
};

const getMultipleAlertsUserAction = ({
  userAction,
  userProfiles,
  attachment,
  alertData,
  loadingAlertData,
  loadingCommentIds,
  getRuleDetailsHref,
  onRuleDetailsClick,
  handleDeleteComment,
}: BuilderArgs): EuiCommentProps[] => {
  if (!Array.isArray(attachment.alertId)) {
    return [];
  }

  const totalAlerts = attachment.alertId.length;
  const { ruleId, ruleName } = getRuleInfo(attachment, alertData);

  return [
    {
      username: userAction.isAssistant ? (
        <HoverableAssistantTitleWithAvatar />
      ) : (
        <HoverableUserWithAvatarResolver user={userAction.createdBy} userProfiles={userProfiles} />
      ),
      eventColor: 'subdued',
      event: (
        <MultipleAlertsCommentEvent
          actionId={userAction.id}
          loadingAlertData={loadingAlertData}
          totalAlerts={totalAlerts}
          ruleId={ruleId}
          ruleName={ruleName}
          getRuleDetailsHref={getRuleDetailsHref}
          onRuleDetailsClick={onRuleDetailsClick}
        />
      ),
      'data-test-subj': `user-action-alert-${userAction.type}-${userAction.action}-action-${userAction.id}`,
      timestamp: <UserActionTimestamp createdAt={userAction.createdAt} />,
      timelineAvatar: 'bell',
      actions: (
        <UserActionContentToolbar id={attachment.id}>
          <EuiFlexItem grow={false}>
            <ShowAlertTableLink />
          </EuiFlexItem>
          <AlertPropertyActions
            onDelete={() =>
              handleDeleteComment(attachment.id, DELETE_ALERTS_SUCCESS_TITLE(totalAlerts))
            }
            isLoading={loadingCommentIds.includes(attachment.id)}
            totalAlerts={totalAlerts}
          />
        </UserActionContentToolbar>
      ),
    },
  ];
};

export const createAlertAttachmentUserActionBuilder = (
  params: BuilderArgs
): ReturnType<UserActionBuilder> => ({
  build: () => {
    const { attachment } = params;
    const alertId = Array.isArray(attachment.alertId) ? attachment.alertId : [attachment.alertId];

    if (alertId.length === 1) {
      return getSingleAlertUserAction(params);
    }

    return getMultipleAlertsUserAction(params);
  },
});

const getFirstItem = (items?: string | string[] | null): string | null => {
  return Array.isArray(items) ? items[0] : items ?? null;
};

export const getRuleId = (
  attachment: BuilderArgs['attachment'],
  alertData?: unknown
): string | null =>
  getRuleField({
    attachmentRuleField: attachment?.rule?.id,
    alertData,
    signalRuleFieldPath: 'signal.rule.id',
    kibanaAlertFieldPath: ALERT_RULE_UUID,
  });

export const getRuleName = (
  attachment: BuilderArgs['attachment'],
  alertData?: unknown
): string | null =>
  getRuleField({
    attachmentRuleField: attachment?.rule?.name,
    alertData,
    signalRuleFieldPath: 'signal.rule.name',
    kibanaAlertFieldPath: ALERT_RULE_NAME,
  });

const getRuleField = ({
  attachmentRuleField,
  alertData,
  signalRuleFieldPath,
  kibanaAlertFieldPath,
}: {
  attachmentRuleField: string | string[] | null | undefined;
  alertData: unknown | undefined;
  signalRuleFieldPath: string;
  kibanaAlertFieldPath: string;
}): string | null => {
  const field =
    getNonEmptyField(attachmentRuleField) ??
    getNonEmptyField(get(alertData, signalRuleFieldPath)) ??
    getNonEmptyField(get(alertData, kibanaAlertFieldPath));

  return field;
};

function getNonEmptyField(field: string | string[] | undefined | null): string | null {
  const firstItem = getFirstItem(field);
  if (firstItem == null || isEmpty(firstItem)) {
    return null;
  }

  return firstItem;
}

export function getRuleInfo(
  attachment: BuilderArgs['attachment'],
  alertData: BuilderArgs['alertData']
) {
  const alertId = getNonEmptyField(attachment.alertId);

  if (!alertId) {
    return { ruleId: null, ruleName: null };
  }

  const alertField: unknown | undefined = alertData[alertId];
  const ruleId = getRuleId(attachment, alertField);
  const ruleName = getRuleName(attachment, alertField);

  return { ruleId, ruleName };
}
