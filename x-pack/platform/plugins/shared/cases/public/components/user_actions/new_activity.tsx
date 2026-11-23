/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiCommentProps } from '@elastic/eui';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiText } from '@elastic/eui';
import type { UserActionUI } from '../../containers/types';
import type { CurrentUserProfile } from '../types';
import * as i18n from './translations';

export const AFTER_LAST_VISIT_CLASS = 'userAction__afterLastVisit';
export const LAST_VISIT_DIVIDER_CLASS = 'lastVisitDivider';
const NEW_ACTIVITY_CLASS = 'userAction__new';

export interface NewActivityContext {
  /** Start of the "what is new" window. */
  readonly since: string;
  readonly currentUserProfile: CurrentUserProfile;
}

const isOwnAction = (userAction: UserActionUI, currentUserProfile: CurrentUserProfile): boolean => {
  const { profileUid, username } = userAction.createdBy;

  return currentUserProfile?.uid != null && profileUid != null
    ? currentUserProfile.uid === profileUid
    : username != null && username === currentUserProfile?.user.username;
};

const joinClassNames = (...classNames: Array<string | undefined>): string =>
  classNames.filter(Boolean).join(' ');

/** Marks the comments built for a user action that happened after the last visit. */
export const markNewActivity = (
  comments: EuiCommentProps[],
  userAction: UserActionUI,
  { since, currentUserProfile }: NewActivityContext
): EuiCommentProps[] => {
  if (new Date(userAction.createdAt).getTime() <= new Date(since).getTime()) {
    return comments;
  }

  const isNew = !isOwnAction(userAction, currentUserProfile);

  return comments.map((comment) => ({
    ...comment,
    className: joinClassNames(
      comment.className,
      AFTER_LAST_VISIT_CLASS,
      isNew ? NEW_ACTIVITY_CLASS : undefined
    ),
    timestamp: isNew ? (
      <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="center" component="span">
        <EuiFlexItem grow={false}>
          <EuiBadge color="primary" data-test-subj="user-action-new-badge">
            {i18n.NEW_ACTIVITY}
          </EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{comment.timestamp}</EuiFlexItem>
      </EuiFlexGroup>
    ) : (
      comment.timestamp
    ),
  }));
};

export const hasAfterLastVisitClass = (comment: EuiCommentProps): boolean =>
  comment.className?.split(' ').includes(AFTER_LAST_VISIT_CLASS) ?? false;

export const createLastVisitDivider = (): EuiCommentProps => ({
  username: '',
  'data-test-subj': 'user-actions-last-visit-divider',
  className: LAST_VISIT_DIVIDER_CLASS,
  timelineAvatar: 'clock',
  timelineAvatarAriaLabel: i18n.LAST_VISIT,
  verticalAlign: 'center',
  children: (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem>
        <EuiHorizontalRule margin="none" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued">
          {i18n.LAST_VISIT}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiHorizontalRule margin="none" />
      </EuiFlexItem>
    </EuiFlexGroup>
  ),
});
