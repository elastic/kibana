/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { get, isEmpty } from 'lodash';
import { EuiFlexItem } from '@elastic/eui';
import { ALERT_RULE_NAME, ALERT_RULE_UUID } from '@kbn/rule-data-utils';

import type { AlertAttachment } from '../../../../common/types/domain';
import type { UserActionBuilder, UserActionBuilderArgs } from '../../user_actions/types';
import { UserActionTimestamp } from '../../user_actions/timestamp';
import type { SnakeToCamelCase } from '../../../../common/types';
import { AlertCommentEvent } from './alert_event';
import { UserActionShowAlert } from './show_alert';
import { ShowAlertTableLink } from './show_alert_table_link';
import { HoverableUserWithAvatarResolver } from '../../user_profiles/hoverable_user_with_avatar_resolver';
import { UserActionContentToolbar } from '../../user_actions/content_toolbar';
import { AlertPropertyActions } from '../../user_actions/property_actions/alert_property_actions';
import { DELETE_ALERTS_SUCCESS_TITLE } from '../../user_actions/comment/translations';

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

export const createAlertAttachmentUserActionBuilder = (
  params: BuilderArgs
): ReturnType<UserActionBuilder> => ({
  build: () => {
    const {
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
    } = params;
    const alertIds = Array.isArray(attachment.alertId) ? attachment.alertId : [attachment.alertId];
    const totalAlerts = alertIds.length;
    if (totalAlerts === 0) {
      return [];
    }
    // Only used if totalAlerts is 1
    const alertId = getNonEmptyField(attachment.alertId);
    const alertIndex = getNonEmptyField(attachment.index);
    if (!alertId || !alertIndex) {
      return [];
    }

    const { ruleId, ruleName } = getRuleInfo(attachment, alertData);

    return [
      {
        username: (
          <HoverableUserWithAvatarResolver
            user={userAction.createdBy}
            userProfiles={userProfiles}
          />
        ),
        eventColor: 'subdued',
        event: (
          <AlertCommentEvent
            actionId={userAction.id}
            totalAlerts={totalAlerts}
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
              {totalAlerts === 1 ? (
                <UserActionShowAlert
                  id={userAction.id}
                  alertId={alertId}
                  index={alertIndex}
                  onShowAlertDetails={onShowAlertDetails}
                />
              ) : (
                <ShowAlertTableLink />
              )}
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
