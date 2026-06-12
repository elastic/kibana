/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiCommentProps, EuiThemeComputed } from '@elastic/eui';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import type { UserActionTypes } from '../../../common/types/domain';
import type {
  CaseUI,
  CaseConnectors,
  UserActionUI,
  AttachmentUIV2,
  CaseUserActionsStats,
  CasesConfigurationUI,
} from '../../containers/types';
import type { UNSUPPORTED_ACTION_TYPES } from './constants';
import type { OnUpdateFields } from '../case_view/types';
import type { ExternalReferenceAttachmentTypeRegistry } from '../../client/attachment_framework/external_reference_registry';
import type { PersistableStateAttachmentTypeRegistry } from '../../client/attachment_framework/persistable_state_registry';
import type { UnifiedAttachmentTypeRegistry } from '../../client/attachment_framework/unified_attachment_registry';
import type { CurrentUserProfile } from '../types';
import type { UserActivityParams } from '../user_actions_activity_bar/types';

export interface UserActionTreeProps {
  caseConnectors: CaseConnectors;
  userProfiles: Map<string, UserProfileWithAvatar>;
  currentUserProfile: CurrentUserProfile;
  data: CaseUI;
  casesConfiguration: CasesConfigurationUI;
  onUpdateField: ({ key, value, onSuccess, onError }: OnUpdateFields) => void;
  statusActionButton: JSX.Element | null;
  attachActionButton?: JSX.Element | null;
  userActivityQueryParams: UserActivityParams;
  userActionsStats: CaseUserActionsStats;
}

type UnsupportedUserActionTypes = (typeof UNSUPPORTED_ACTION_TYPES)[number];
export type SupportedUserActionTypes = keyof Omit<
  typeof UserActionTypes,
  UnsupportedUserActionTypes
>;

export interface UserActionBuilderArgs {
  appId: string;
  caseData: CaseUI;
  casesConfiguration: CasesConfigurationUI;
  userProfiles: Map<string, UserProfileWithAvatar>;
  currentUserProfile: CurrentUserProfile;
  externalReferenceAttachmentTypeRegistry: ExternalReferenceAttachmentTypeRegistry;
  persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry;
  unifiedAttachmentTypeRegistry: UnifiedAttachmentTypeRegistry;
  caseConnectors: CaseConnectors;
  userAction: UserActionUI;
  attachments: AttachmentUIV2[];
  index: number;
  manageMarkdownEditIds: string[];
  selectedOutlineCommentId: string;
  loadingCommentIds: string[];
  handleOutlineComment: (id: string) => void;
  handleDeleteComment: (id: string, successToasterTitle: string) => void;
  euiTheme: EuiThemeComputed<{}>;
}

export type UserActionBuilder = (args: UserActionBuilderArgs) => {
  build: () => EuiCommentProps[];
};

export type UserActionBuilderMap = Record<SupportedUserActionTypes, UserActionBuilder>;

interface Signal {
  rule: {
    id: string;
    name: string;
    to: string;
    from: string;
  };
}

export interface Alert {
  _id: string;
  _index: string;
  '@timestamp': string;
  signal: Signal;
  [key: string]: unknown;
}
