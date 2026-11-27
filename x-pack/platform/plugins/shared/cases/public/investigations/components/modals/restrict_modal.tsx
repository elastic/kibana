/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiLoadingSpinner,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { SuggestUsersPopover } from '../../../components/case_view/components/suggest_users_popover';
import { HoverableUserWithAvatar } from '../../../components/user_profiles/hoverable_user_with_avatar';
import { useBulkGetUserProfiles } from '../../../containers/user_profiles/use_bulk_get_user_profiles';
import { useGetCurrentUserProfile } from '../../../containers/user_profiles/use_get_current_user_profile';
import { getHttpErrorMessage, useInvestigationToasts, useUpdateRecord } from '../../hooks';
import { ICONS } from '../../icons';
import type { InvestigationModalProps } from './modal_props';
import * as i18n from './translations';

const NO_PROFILES = new Map<string, UserProfileWithAvatar>();

/** The assignees as Cases shows them: an avatar and a name per person. */
const AssigneeList: React.FC<{ profiles: UserProfileWithAvatar[]; isLoading: boolean }> = ({
  profiles,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="m" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued">
            {i18n.RESTRICT_PEOPLE_LOADING}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
  if (profiles.length === 0) {
    return (
      <EuiText size="s" color="subdued" data-test-subj="investigationRestrictPeopleEmpty">
        {i18n.RESTRICT_PEOPLE_EMPTY}
      </EuiText>
    );
  }
  return (
    <EuiFlexGroup direction="column" gutterSize="s" data-test-subj="investigationRestrictPeople">
      {profiles.map((profile) => (
        <EuiFlexItem key={profile.uid} data-test-subj="investigationRestrictPerson">
          <HoverableUserWithAvatar userInfo={profile} />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
AssigneeList.displayName = 'AssigneeList';

/** The assignees that can still open a restricted investigation, resolved to profiles. */
const useAssigneeProfiles = (uids: string[]) => {
  const { data: profiles, isLoading } = useBulkGetUserProfiles({ uids });
  const resolved = useMemo(
    () =>
      uids
        .map((uid) => (profiles ?? NO_PROFILES).get(uid))
        .filter((profile): profile is UserProfileWithAvatar => profile !== undefined),
    [profiles, uids]
  );
  return { profiles: resolved, isLoading: isLoading && uids.length > 0 };
};

/** Restricts the investigation: picks the assignees and makes them the only people who can see it. */
const RestrictForm: React.FC<InvestigationModalProps> = ({ record, onClose }) => {
  const titleId = useGeneratedHtmlId();
  const { showSuccess } = useInvestigationToasts();
  const { data: currentUserProfile } = useGetCurrentUserProfile();
  const { mutate: save, isLoading: isSaving } = useUpdateRecord(record.id, {
    silentErrors: true,
  });
  const { profiles: assigned, isLoading: isLoadingProfiles } = useAssigneeProfiles(
    record.assignees
  );

  const [edited, setEdited] = useState<UserProfileWithAvatar[] | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // You keep access, so you start on the list (Cases adds the person who restricts).
  const initial = useMemo(
    () =>
      currentUserProfile && !assigned.some(({ uid }) => uid === currentUserProfile.uid)
        ? [currentUserProfile, ...assigned]
        : assigned,
    [assigned, currentUserProfile]
  );
  const selected = edited ?? initial;
  const isReady = !isLoadingProfiles;

  const togglePicker = useCallback(() => setIsPickerOpen((open) => !open), []);
  const closePicker = useCallback(() => setIsPickerOpen(false), []);

  const restrict = () => {
    setError(null);
    save(
      { access: { mode: 'restricted' }, assignees: selected.map(({ uid }) => uid) },
      {
        onSuccess: () => {
          showSuccess(i18n.RESTRICT_SAVED);
          onClose();
        },
        onError: (saveError) => setError(getHttpErrorMessage(saveError)),
      }
    );
  };

  return (
    <EuiModal
      onClose={onClose}
      aria-labelledby={titleId}
      data-test-subj="investigationRestrictModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId}>{i18n.RESTRICT_TITLE}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiText size="s" data-test-subj="investigationRestrictIntro">
          <p>{i18n.RESTRICT_INTRO}</p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiFormRow label={i18n.RESTRICT_PEOPLE_LABEL} fullWidth>
          <EuiFlexGroup direction="column" gutterSize="s" alignItems="flexStart">
            <EuiFlexItem>
              <AssigneeList profiles={selected} isLoading={!isReady} />
            </EuiFlexItem>
            <EuiFlexItem grow={false} data-test-subj="investigationRestrictPicker">
              <SuggestUsersPopover
                assignedUsersWithProfiles={selected.map((profile) => ({
                  uid: profile.uid,
                  profile,
                }))}
                currentUserProfile={currentUserProfile}
                isLoading={isSaving}
                isPopoverOpen={isPickerOpen}
                onUsersChange={setEdited}
                onClosePopover={closePicker}
                togglePopover={togglePicker}
                button={
                  <EuiButtonEmpty
                    size="s"
                    iconType={ICONS.edit}
                    onClick={togglePicker}
                    isDisabled={isSaving}
                    data-test-subj="investigationRestrictEditAssignees"
                  >
                    {i18n.RESTRICT_EDIT_ASSIGNEES}
                  </EuiButtonEmpty>
                }
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFormRow>
        <EuiSpacer size="m" />
        <EuiText size="s" color="subdued">
          <p>{i18n.RESTRICT_EFFECT}</p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiCallOut
          size="s"
          color="warning"
          iconType={ICONS.warning}
          title={i18n.RESTRICT_CASES_WARNING}
          data-test-subj="investigationRestrictCasesWarning"
        />
        {error ? (
          <>
            <EuiSpacer size="m" />
            <EuiCallOut
              announceOnMount
              size="s"
              color="danger"
              iconType={ICONS.error}
              title={i18n.RESTRICT_ERROR}
              data-test-subj="investigationRestrictError"
            >
              {error}
            </EuiCallOut>
          </>
        ) : null}
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose} isDisabled={isSaving}>
          {i18n.CANCEL}
        </EuiButtonEmpty>
        <EuiButton
          fill
          isLoading={isSaving}
          isDisabled={!isReady || selected.length === 0}
          onClick={restrict}
          data-test-subj="investigationRestrictSave"
        >
          {i18n.RESTRICT_SAVE}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
RestrictForm.displayName = 'RestrictForm';

/** A restricted investigation: who can see it, and the one control to make it visible again. */
const RestrictedDetails: React.FC<InvestigationModalProps> = ({ record, onClose }) => {
  const titleId = useGeneratedHtmlId();
  const [error, setError] = useState<string | null>(null);
  const { showSuccess } = useInvestigationToasts();
  const { mutate: makeVisible, isLoading } = useUpdateRecord(record.id, { silentErrors: true });
  const { profiles, isLoading: isLoadingProfiles } = useAssigneeProfiles(record.assignees);

  const onMakeVisible = () => {
    setError(null);
    makeVisible(
      { access: { mode: 'default' } },
      {
        onSuccess: () => {
          showSuccess(i18n.RESTRICT_REMOVED);
          onClose();
        },
        onError: (saveError) => setError(getHttpErrorMessage(saveError)),
      }
    );
  };

  return (
    <EuiModal
      onClose={onClose}
      aria-labelledby={titleId}
      data-test-subj="investigationRestrictModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId}>{i18n.RESTRICTED_TITLE}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiText size="s" data-test-subj="investigationRestrictIntro">
          <p>{i18n.RESTRICTED_INTRO}</p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiFormRow label={i18n.RESTRICT_PEOPLE_LABEL} fullWidth>
          <AssigneeList profiles={profiles} isLoading={isLoadingProfiles} />
        </EuiFormRow>
        {error ? (
          <>
            <EuiSpacer size="m" />
            <EuiCallOut
              announceOnMount
              size="s"
              color="danger"
              iconType={ICONS.error}
              title={i18n.RESTRICT_REMOVE_ERROR}
              data-test-subj="investigationRestrictError"
            >
              {error}
            </EuiCallOut>
          </>
        ) : null}
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose} isDisabled={isLoading}>
          {i18n.CLOSE_BUTTON}
        </EuiButtonEmpty>
        <EuiButton
          fill
          isLoading={isLoading}
          onClick={onMakeVisible}
          data-test-subj="investigationRestrictRemove"
        >
          {i18n.RESTRICT_REMOVE}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
RestrictedDetails.displayName = 'RestrictedDetails';

/** Take action > Restrict to assigned people, or Make visible to everyone for a restricted record. */
export const RestrictModal: React.FC<InvestigationModalProps> = (props) =>
  props.record.access.mode === 'restricted' ? (
    <RestrictedDetails {...props} />
  ) : (
    <RestrictForm {...props} />
  );
RestrictModal.displayName = 'RestrictModal';
