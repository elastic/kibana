/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, type MouseEvent } from 'react';
import { css } from '@emotion/react';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import type { CaseAssignees } from '../../../../../../common/types/domain';
import type { CasesPermissions } from '../../../../../../common';
import { useAssignees } from '../../../../../containers/user_profiles/use_assignees';
import * as i18n from '../../../../case_view/translations';
import * as redesignI18n from '../../../translations';
import { useCasesContext } from '../../../../cases_context/use_cases_context';
import type { Assignee } from '../../../../user_profiles/types';
import { SuggestUsersPopover } from '../../../../case_view/components/suggest_users_popover';
import type { CurrentUserProfile } from '../../../../case_view/types';
import { SmallUserAvatar } from '../../../../user_profiles/small_user_avatar';
import { UserToolTip } from '../../../../user_profiles/user_tooltip';
import { useAssigneesPicker } from './use_assignees_picker';

export interface AssigneesFieldPanelProps {
  caseAssignees: CaseAssignees;
  currentUserProfile: CurrentUserProfile;
  userProfiles: Map<string, UserProfileWithAvatar>;
  onAssigneesChanged: (assignees: Assignee[]) => void;
  isLoading: boolean;
}

interface AssigneesEmptyStateProps {
  currentUserProfile: CurrentUserProfile;
  permissions: CasesPermissions;
  assignSelf: () => void;
  openPopover: () => void;
}

const AssigneesEmptyState: React.FC<AssigneesEmptyStateProps> = ({
  currentUserProfile,
  permissions,
  assignSelf,
  openPopover,
}) => {
  const onAssignUserClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    openPopover();
  };

  const onAssignSelfClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    assignSelf();
  };

  return (
    <EuiText size="s" color="subdued">
      <p>
        {i18n.NO_ASSIGNEES}
        {permissions.assign && (
          <>
            <br />
            <EuiLink
              data-test-subj="case-view-assign-users-link"
              href="#"
              onClick={onAssignUserClick}
            >
              {i18n.ASSIGN_A_USER}
            </EuiLink>
          </>
        )}
        {currentUserProfile && permissions.assign && (
          <>
            <span>{i18n.SPACED_OR}</span>
            <EuiLink
              data-test-subj="case-view-assign-yourself-link"
              href="#"
              onClick={onAssignSelfClick}
            >
              {i18n.ASSIGN_YOURSELF}
            </EuiLink>
          </>
        )}
      </p>
    </EuiText>
  );
};

AssigneesEmptyState.displayName = 'AssigneesEmptyState';

const AssigneesFieldPanelComponent: React.FC<AssigneesFieldPanelProps> = ({
  caseAssignees,
  userProfiles,
  currentUserProfile,
  onAssigneesChanged,
  isLoading,
}) => {
  const { assigneesWithProfiles, assigneesWithoutProfiles, allAssignees } = useAssignees({
    caseAssignees,
    userProfiles,
  });

  const { isPopoverOpen, togglePopover, openPopover, onClosePopover, onUsersChange, assignSelf } =
    useAssigneesPicker({
      allAssignees,
      assigneesWithoutProfiles,
      currentUserProfile,
      onAssigneesChanged,
    });

  const { permissions } = useCasesContext();
  const { euiTheme } = useEuiTheme();

  const assignedLabelStyles = useMemo(
    () => css`
      font-weight: ${euiTheme.font.weight.semiBold};
    `,
    [euiTheme]
  );

  const hiddenPopoverAnchorStyles = useMemo(
    () => css`
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      border: 0;
    `,
    []
  );

  const addAssigneeButton = useMemo(
    () => (
      <EuiToolTip position="left" content={i18n.EDIT_ASSIGNEES}>
        <EuiButtonIcon
          data-test-subj="case-view-assignees-add-button"
          aria-label={i18n.EDIT_ASSIGNEES_ARIA_LABEL}
          iconType="plusInCircle"
          color="primary"
          onClick={togglePopover}
          disabled={isLoading}
        />
      </EuiToolTip>
    ),
    [isLoading, togglePopover]
  );

  const hasAssignees = allAssignees.length > 0;
  const showAssigneesPopover = !isLoading && permissions.assign;

  const assigneesPopover = useMemo(
    () => (
      <SuggestUsersPopover
        assignedUsersWithProfiles={assigneesWithProfiles}
        currentUserProfile={currentUserProfile}
        isLoading={isLoading}
        isPopoverOpen={isPopoverOpen}
        onUsersChange={onUsersChange}
        onClosePopover={onClosePopover}
        togglePopover={togglePopover}
        button={addAssigneeButton}
      />
    ),
    [
      addAssigneeButton,
      assigneesWithProfiles,
      currentUserProfile,
      isLoading,
      isPopoverOpen,
      onClosePopover,
      onUsersChange,
      togglePopover,
    ]
  );

  return (
    <EuiPanel
      data-test-subj="case-view-assignees-field-panel"
      hasShadow={false}
      hasBorder={true}
      paddingSize="m"
    >
      <EuiText size="xs" color="subdued" data-test-subj="case-view-assignees-field-label">
        <span css={assignedLabelStyles}>{redesignI18n.ASSIGNED_TITLE}</span>
      </EuiText>
      <EuiSpacer size="m" />
      {isLoading && !hasAssignees ? (
        <EuiLoadingSpinner data-test-subj="case-view-assignees-button-loading" />
      ) : (
        <>
          {(hasAssignees || showAssigneesPopover) && (
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap={hasAssignees}>
              {hasAssignees
                ? allAssignees.map((assignee) => (
                    <EuiFlexItem grow={false} key={assignee.uid}>
                      <UserToolTip userInfo={assignee.profile}>
                        <SmallUserAvatar userInfo={assignee.profile} />
                      </UserToolTip>
                    </EuiFlexItem>
                  ))
                : null}
              {isLoading && hasAssignees ? (
                <EuiFlexItem grow={false}>
                  <EuiLoadingSpinner data-test-subj="case-view-assignees-button-loading" />
                </EuiFlexItem>
              ) : null}
              {showAssigneesPopover ? (
                <EuiFlexItem
                  grow={false}
                  css={!hasAssignees ? hiddenPopoverAnchorStyles : undefined}
                  data-test-subj="case-view-assignees-edit"
                >
                  {assigneesPopover}
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
          )}
          {!hasAssignees && !isLoading ? (
            <AssigneesEmptyState
              currentUserProfile={currentUserProfile}
              permissions={permissions}
              assignSelf={assignSelf}
              openPopover={openPopover}
            />
          ) : null}
        </>
      )}
    </EuiPanel>
  );
};

AssigneesFieldPanelComponent.displayName = 'AssigneesFieldPanel';

export const AssigneesFieldPanel = React.memo(AssigneesFieldPanelComponent);
