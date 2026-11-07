/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createElement, useMemo } from 'react';
import type { EuiCommentProps, EuiThemeComputed } from '@elastic/eui';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';

import type {
  AttachmentUIV2,
  UserActionUI,
  CasesConfigurationUI,
  CaseUI,
  CaseConnectors,
} from '../../../containers/types';
import type { CurrentUserProfile } from '../../types';
import type { UnifiedAttachmentTypeRegistry } from '../../../client/attachment_framework/unified_attachment_registry';
import type { RelatedRemovalOptions } from '../../../client/attachment_framework/types';
import type { CasesPermissions } from '../../../../common/ui/types';
import { isUserActionTypeSupported } from '../helpers';
import { builderMap } from '../builder';
import { createCommonUpdateUserActionBuilder } from '../common';
import { OPENED_FROM_ALERTZERO } from '../translations';
import { getAlertZeroOpening } from './merge_alertzero_opening';

interface UseBuildUserActionsArgs {
  caseUserActions: UserActionUI[];
  attachments: AttachmentUIV2[];
  caseData: CaseUI;
  casesConfiguration: CasesConfigurationUI;
  caseConnectors: CaseConnectors;
  userProfiles: Map<string, UserProfileWithAvatar>;
  currentUserProfile: CurrentUserProfile;
  appId: string;
  unifiedAttachmentTypeRegistry: UnifiedAttachmentTypeRegistry;
  permissions: CasesPermissions;
  manageMarkdownEditIds: string[];
  selectedOutlineCommentId: string;
  loadingCommentIds: string[];
  euiTheme: EuiThemeComputed<{}>;
  handleOutlineComment: (id: string) => void;
  handleDeleteComment: (
    id: string,
    successToasterTitle: string,
    options?: RelatedRemovalOptions
  ) => void;
  /** Render an AlertZero case's opening and its first investigation links as one event. */
  mergeAlertZeroOpening?: boolean;
}

export const useBuildUserActions = ({
  caseUserActions,
  attachments,
  caseData,
  casesConfiguration,
  caseConnectors,
  userProfiles,
  currentUserProfile,
  appId,
  unifiedAttachmentTypeRegistry,
  permissions,
  manageMarkdownEditIds,
  selectedOutlineCommentId,
  loadingCommentIds,
  euiTheme,
  handleOutlineComment,
  handleDeleteComment,
  mergeAlertZeroOpening = false,
}: UseBuildUserActionsArgs): EuiCommentProps[] => {
  return useMemo(() => {
    if (!caseUserActions) {
      return [];
    }

    const opening = mergeAlertZeroOpening
      ? getAlertZeroOpening(caseUserActions, caseData)
      : undefined;

    return caseUserActions.reduce<EuiCommentProps[]>((userActions, userAction, index) => {
      if (!isUserActionTypeSupported(userAction.type)) {
        return userActions;
      }

      if (opening?.mergedUserActionIds.has(userAction.id)) {
        return userActions;
      }

      if (opening?.createUserActionId === userAction.id) {
        return [
          ...userActions,
          ...createCommonUpdateUserActionBuilder({
            userAction,
            userProfiles,
            handleOutlineComment,
            label: createElement(
              'span',
              { 'data-test-subj': 'case-view-opened-from-alertzero' },
              OPENED_FROM_ALERTZERO(opening.linkedCount)
            ),
            icon: 'dot',
          }).build(),
        ];
      }

      const builder = builderMap[userAction.type];

      if (builder == null) {
        return userActions;
      }

      const userActionBuilder = builder({
        appId,
        caseData,
        casesConfiguration,
        caseConnectors,
        unifiedAttachmentTypeRegistry,
        permissions,
        userAction,
        userProfiles,
        currentUserProfile,
        attachments,
        index,
        manageMarkdownEditIds,
        selectedOutlineCommentId,
        loadingCommentIds,
        euiTheme,
        handleOutlineComment,
        handleDeleteComment,
      });
      return [...userActions, ...userActionBuilder.build()];
    }, []);
  }, [
    caseUserActions,
    appId,
    caseData,
    casesConfiguration,
    caseConnectors,
    unifiedAttachmentTypeRegistry,
    permissions,
    userProfiles,
    currentUserProfile,
    attachments,
    manageMarkdownEditIds,
    selectedOutlineCommentId,
    loadingCommentIds,
    euiTheme,
    handleOutlineComment,
    handleDeleteComment,
    mergeAlertZeroOpening,
  ]);
};
